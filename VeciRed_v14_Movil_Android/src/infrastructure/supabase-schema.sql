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
