-- RunaRed v15: ejecutar SOLO en un proyecto Supabase NUEVO.
-- No ejecutar sobre tablas existentes sin planificar migración.
create table public.sectors (id uuid primary key default gen_random_uuid(), name text not null, district text);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 2 and 60),
 animal text not null default 'castor' check(animal in ('castor','cuy','vizcacha','alpaca')),
 habitat text not null default 'estanque' check(habitat in ('estanque','andes','jardin')),
 hobby text not null default '',
 sector_id uuid references public.sectors(id), created_at timestamptz not null default now()
);
create table public.private_contacts (user_id uuid primary key references public.profiles(id) on delete cascade, whatsapp_phone text check(whatsapp_phone is null or whatsapp_phone ~ '^519[0-9]{8}$'));
create table public.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('servicio','favor','emergencia')),
 title text not null check(char_length(title) between 1 and 120),
 body text not null check(char_length(body) between 1 and 500),
 resource text, active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.private_contacts enable row level security;
create policy "profiles select authenticated" on public.profiles for select to authenticated using(true);
create policy "profiles update owner" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
-- No SELECT directo sobre private_contacts. Acceso puntual mediante función autenticada.
create or replace function public.get_neighbor_whatsapp(target_user_id uuid) returns text
language plpgsql security definer set search_path=public as $$
declare result text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- TODO producción: verificar pertenencia de ambos usuarios a la misma comunidad aprobada.
 select whatsapp_phone into result from public.private_contacts where user_id=target_user_id;
 return result;
end;$$;
revoke all on function public.get_neighbor_whatsapp(uuid) from public;
grant execute on function public.get_neighbor_whatsapp(uuid) to authenticated;
create policy "posts select authenticated" on public.posts for select to authenticated using(true);
create policy "posts insert owner" on public.posts for insert to authenticated with check(author_id=auth.uid());
create policy "posts update owner" on public.posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,animal,habitat,hobby) values(
 new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)),60),
 case when (new.raw_user_meta_data->>'animal') in ('castor','cuy','vizcacha','alpaca') then new.raw_user_meta_data->>'animal' else 'castor' end,
 case when (new.raw_user_meta_data->>'habitat') in ('estanque','andes','jardin') then new.raw_user_meta_data->>'habitat' else 'estanque' end,
 left(coalesce(new.raw_user_meta_data->>'hobby',''),100)
 );
 insert into public.private_contacts(user_id,whatsapp_phone) values(new.id,case when (new.raw_user_meta_data->>'phone') ~ '^519[0-9]{8}$' then new.raw_user_meta_data->>'phone' else null end);
 return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create or replace function public.protect_profile_identity() returns trigger language plpgsql as $$
begin
 if new.id<>old.id or new.display_name<>old.display_name then raise exception 'Identity fields cannot be changed';end if;
 return new;
end;$$;
create trigger profile_identity_immutable before update on public.profiles for each row execute function public.protect_profile_identity();
-- IMPORTANT: these policies allow all authenticated users to see profiles and posts.
-- Before public launch implement verified neighborhood membership and sector-limited RLS.
-- WhatsApp no se descarga en listados; RPC puntual al pulsar contacto.
-- La función todavía permite a usuarios autenticados consultar cualquier UUID conocido: limitar por comunidad antes de producción.

-- El autor puede eliminar sus publicaciones.
create policy "posts delete owner" on public.posts for delete to authenticated using(author_id=(select auth.uid()));

-- Aplicar DESPUÉS, sobre la base v14 existente. Conserva contactos y publicaciones.
begin;
alter table public.private_contacts
 add column if not exists calls_enabled boolean not null default false;

create or replace function public.get_my_call_settings() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare contact public.private_contacts%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into contact from public.private_contacts where user_id = auth.uid();
 return jsonb_build_object('has_phone', contact.whatsapp_phone is not null,
                          'allowed', coalesce(contact.calls_enabled, false));
end; $$;

create or replace function public.set_my_call_consent(allowed boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if allowed is null then raise exception 'Consent is required'; end if;
 update public.private_contacts set calls_enabled = allowed
 where user_id = auth.uid() and (not allowed or whatsapp_phone is not null);
 if not found then raise exception 'No hay un teléfono registrado'; end if;
end; $$;

create or replace function public.get_neighbor_call_phone(target_user_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Misma limitación que WhatsApp: restringir por comunidad verificada antes de uso público.
 return (select whatsapp_phone from public.private_contacts
         where user_id = target_user_id and calls_enabled = true);
end; $$;

revoke all on function public.get_my_call_settings() from public, anon;
revoke all on function public.set_my_call_consent(boolean) from public, anon;
revoke all on function public.get_neighbor_call_phone(uuid) from public, anon;
grant execute on function public.get_my_call_settings() to authenticated;
grant execute on function public.set_my_call_consent(boolean) to authenticated;
grant execute on function public.get_neighbor_call_phone(uuid) to authenticated;
commit;


-- v15: aplicar sobre la base v14 existente, después de posts_delete y call_consent.
-- No ejecutar de nuevo el esquema inicial. No borra datos ni cambia los permisos de llamadas.
begin;
alter table public.profiles drop constraint if exists profiles_animal_check;
alter table public.profiles add constraint profiles_animal_check check (animal in ('castor','cuy','gallito','llama','vicuna','oso','vizcacha','alpaca'));
alter table public.profiles drop constraint if exists profiles_habitat_check;
alter table public.profiles add constraint profiles_habitat_check check (habitat in ('estanque','andes','bosque','costa','valle','nublado','jardin'));

create table if not exists public.recommendations (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 type text not null check (type in ('vecino','lugar')),
 target_user_id uuid references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 90),
 description text not null default '' check (char_length(description)<=500),
 maps_url text not null default '',
 created_at timestamptz not null default now()
);
-- Recrear estas restricciones permite aplicar también sobre la tabla de la v16.
alter table public.recommendations drop constraint if exists recommendations_target_user_id_fkey;
alter table public.recommendations add constraint recommendations_target_user_id_fkey
 foreign key (target_user_id) references public.profiles(id) on delete cascade;
alter table public.recommendations drop constraint if exists recommendations_target_check;
alter table public.recommendations add constraint recommendations_target_check check (
 (type='vecino' and target_user_id is not null and target_user_id<>author_id and maps_url='')
 or (type='lugar' and target_user_id is null)
);
alter table public.recommendations drop constraint if exists recommendations_title_check;
alter table public.recommendations add constraint recommendations_title_check check (char_length(btrim(title)) between 1 and 90);
alter table public.recommendations drop constraint if exists recommendations_maps_url_check;
alter table public.recommendations add constraint recommendations_maps_url_check check (
 maps_url='' or maps_url ~ '^https://((www\.)?google\.com/maps([/?#]|$)|maps\.google\.com/|maps\.app\.goo\.gl/)[^[:space:]]*$'
);
create index if not exists recommendations_created_at_idx on public.recommendations(created_at desc);
create index if not exists recommendations_author_idx on public.recommendations(author_id);
create index if not exists recommendations_target_idx on public.recommendations(target_user_id);
alter table public.recommendations enable row level security;
drop policy if exists "recommendations read" on public.recommendations;
drop policy if exists "recommendations insert own" on public.recommendations;
drop policy if exists "recommendations delete own" on public.recommendations;
create policy "recommendations read" on public.recommendations for select to authenticated using(true);
create policy "recommendations insert own" on public.recommendations for insert to authenticated with check (author_id=(select auth.uid()));
create policy "recommendations delete own" on public.recommendations for delete to authenticated using(author_id=(select auth.uid()));
revoke all on public.recommendations from anon;
grant select,insert,delete on public.recommendations to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name,animal,habitat,hobby) values(
 new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)),60),
 case when new.raw_user_meta_data->>'animal' in ('castor','cuy','gallito','llama','vicuna','oso','vizcacha','alpaca') then new.raw_user_meta_data->>'animal' else 'castor' end,
 case when new.raw_user_meta_data->>'habitat' in ('estanque','andes','bosque','costa','valle','nublado','jardin') then new.raw_user_meta_data->>'habitat' else 'estanque' end,
 left(coalesce(new.raw_user_meta_data->>'hobby',''),100));
 insert into public.private_contacts(user_id,whatsapp_phone) values(new.id,
 case when (new.raw_user_meta_data->>'phone') ~ '^519[0-9]{8}$' then new.raw_user_meta_data->>'phone' else null end);
 return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
commit;
-- Demo de una comunidad: lectura autenticada compartida como en v14.
-- Antes de lanzamiento público: pertenencia verificada y RLS por comunidad para todas las tablas y RPC.
