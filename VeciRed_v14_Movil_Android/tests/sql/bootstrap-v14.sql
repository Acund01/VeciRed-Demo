-- SOLO pruebas locales desechables. Nunca ejecutar en Supabase ni en una base con datos reales.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
-- VeciRed v13: ejecutar en un proyecto Supabase NUEVO.
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

insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','local-a@example.test','{"display_name":"Vecino A","animal":"alpaca","habitat":"jardin","phone":"51987654321"}'),
 ('22222222-2222-4222-8222-222222222222','local-b@example.test','{"display_name":"Vecino B","animal":"cuy"}');
insert into public.posts(id,author_id,kind,title,body) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','servicio','Publicación anterior','Se conserva después de migrar');
