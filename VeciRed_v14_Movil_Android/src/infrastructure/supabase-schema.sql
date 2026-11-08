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


-- v15: mapa y ubicaciones provenientes de la rama v17 (11af62e).
-- Aplicar después de las migraciones de publicaciones, llamadas y recomendaciones.
begin;
alter table public.posts add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.posts drop constraint if exists posts_location_pair_check;
alter table public.posts add constraint posts_location_pair_check check (
 (latitude is null and longitude is null)
 or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);
create or replace function public.round_post_map_location() returns trigger language plpgsql set search_path='' as $$
begin
 if not new.active then new.latitude:=null;new.longitude:=null;return new;end if;
 if (new.latitude is null) <> (new.longitude is null) then raise exception 'Both coordinates are required'; end if;
 if new.latitude is not null then
  if not (new.latitude between -90 and 90 and new.longitude between -180 and 180) then raise exception 'Invalid coordinates'; end if;
  new.latitude:=round(new.latitude::numeric,3)::double precision;
  new.longitude:=round(new.longitude::numeric,3)::double precision;
 end if;
 return new;
end; $$;
drop trigger if exists round_post_map_location_before_write on public.posts;
create trigger round_post_map_location_before_write before insert or update on public.posts
 for each row execute function public.round_post_map_location();

create table if not exists public.shared_locations (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 expires_at timestamptz not null,
 updated_at timestamptz not null default now()
);
create index if not exists shared_locations_expires_at_idx on public.shared_locations(expires_at);
create or replace function public.round_shared_location() returns trigger language plpgsql set search_path='' as $$
begin
 if new.latitude is null or new.longitude is null or not(new.latitude between -90 and 90 and new.longitude between -180 and 180) then raise exception 'Invalid coordinates'; end if;
 new.latitude:=round(new.latitude::numeric,3)::double precision;
 new.longitude:=round(new.longitude::numeric,3)::double precision;
 new.updated_at:=now();
 new.expires_at:=now()+interval '30 minutes';
 return new;
end; $$;
drop trigger if exists round_shared_location_before_write on public.shared_locations;
create trigger round_shared_location_before_write before insert or update on public.shared_locations
 for each row execute function public.round_shared_location();
alter table public.shared_locations enable row level security;
drop policy if exists "shared locations read while active" on public.shared_locations;
drop policy if exists "share own location for at most 30 minutes" on public.shared_locations;
drop policy if exists "update own shared location" on public.shared_locations;
drop policy if exists "stop sharing own location" on public.shared_locations;
-- El dueño puede recuperar/reemplazar su fila vencida. Otros solo ven ubicaciones vigentes.
create policy "shared locations read while active" on public.shared_locations for select to authenticated
 using(expires_at>now() or user_id=(select auth.uid()));
create policy "share own location for at most 30 minutes" on public.shared_locations for insert to authenticated
 with check(user_id=(select auth.uid()) and expires_at>now() and expires_at<=now()+interval '30 minutes');
create policy "update own shared location" on public.shared_locations for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and expires_at>now() and expires_at<=now()+interval '30 minutes');
create policy "stop sharing own location" on public.shared_locations for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.shared_locations from anon;
grant select,insert,update,delete on public.shared_locations to authenticated;

create or replace function public.share_my_location(p_latitude double precision,p_longitude double precision) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.shared_locations(user_id,latitude,longitude,expires_at)
 values(auth.uid(),p_latitude,p_longitude,now()+interval '30 minutes')
 on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,expires_at=excluded.expires_at;
end; $$;
revoke all on function public.share_my_location(double precision,double precision) from public,anon;
grant execute on function public.share_my_location(double precision,double precision) to authenticated;

create or replace function public.purge_expired_shared_locations() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from public.shared_locations where expires_at<=now();
end; $$;
revoke all on function public.purge_expired_shared_locations() from public,anon;
grant execute on function public.purge_expired_shared_locations() to authenticated;
commit;
-- RLS oculta los puntos vencidos a otros usuarios. La limpieza física requiere invocar purge o programarla.
-- Esta demo comparte ubicaciones entre usuarios autenticados; falta membresía por comunidad para producción.


-- Preliminar v18: aplicar SOLO después del actualizador v15.
-- Origen funcional: rama v17, commit 3000085. No recrea ni borra la base.
begin;

create or replace function public.get_my_whatsapp() returns text
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return (select whatsapp_phone from public.private_contacts where user_id=auth.uid());
end; $$;
revoke all on function public.get_my_whatsapp() from public,anon;
grant execute on function public.get_my_whatsapp() to authenticated;
create or replace function public.update_my_whatsapp(new_phone text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if new_phone is not null and new_phone !~ '^519[0-9]{8}$' then raise exception 'Invalid Peruvian phone';end if;
 insert into public.private_contacts(user_id,whatsapp_phone,calls_enabled) values(auth.uid(),new_phone,false)
 on conflict(user_id) do update set whatsapp_phone=excluded.whatsapp_phone,
 calls_enabled=case when public.private_contacts.whatsapp_phone is distinct from excluded.whatsapp_phone then false else public.private_contacts.calls_enabled end;
end; $$;
revoke all on function public.update_my_whatsapp(text) from public,anon;
grant execute on function public.update_my_whatsapp(text) to authenticated;

alter table public.recommendations
 add column if not exists category text,
 add column if not exists rating integer,
 add column if not exists place_tag text,
 add column if not exists tags text[] not null default '{}',
 add column if not exists latitude double precision,
 add column if not exists longitude double precision;
alter table public.recommendations drop constraint if exists recommendations_location_pair_check;
alter table public.recommendations add constraint recommendations_location_pair_check check (
 (latitude is null and longitude is null) or
 (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);
alter table public.recommendations drop constraint if exists recommendations_rating_check;
alter table public.recommendations add constraint recommendations_rating_check check(rating is null or rating between 1 and 5);
alter table public.recommendations drop constraint if exists recommendations_category_check;
alter table public.recommendations add constraint recommendations_category_check check(category is null or category in('solidaridad','buen_vecino','servicio_confiable','conocimiento','apoyo_emergencia'));
-- Conservar los registros anteriores; completar solo etiquetas que ya existían en otros campos.
update public.recommendations set tags=array[place_tag] where cardinality(tags)=0 and place_tag is not null and char_length(btrim(place_tag)) between 1 and 40;
update public.recommendations set tags=array[case category when 'solidaridad' then 'Solidaridad' when 'buen_vecino' then 'Buen vecino' when 'servicio_confiable' then 'Servicio confiable' when 'conocimiento' then 'Comparte conocimiento' when 'apoyo_emergencia' then 'Apoyo en emergencia' else category end]
 where cardinality(tags)=0 and category is not null;

create or replace function public.validate_v18_recommendation() returns trigger
language plpgsql set search_path='' as $$
declare cleaned text[];
begin
 if new.tags is null or coalesce(cardinality(new.tags),0)>5 or array_ndims(new.tags)>1 then raise exception 'At most five tags';end if;
 if exists(select 1 from unnest(new.tags) entry(value) where value is null or char_length(regexp_replace(btrim(value),'\s+',' ','g')) not between 1 and 40) then raise exception 'Invalid tag';end if;
 select coalesce(array_agg(tag order by position),'{}'::text[]) into cleaned
 from (select distinct on(lower(regexp_replace(btrim(value),'\s+',' ','g'))) regexp_replace(btrim(value),'\s+',' ','g') tag,position
       from unnest(new.tags) with ordinality entry(value,position)
       order by lower(regexp_replace(btrim(value),'\s+',' ','g')),position) unique_tags;
 new.tags:=cleaned;
 -- Permitir actualizaciones administrativas de registros antiguos sin campos v18.
 if tg_op='INSERT' or cardinality(new.tags)>0 or new.rating is not null or new.latitude is not null or new.longitude is not null then
  if cardinality(new.tags)=0 then raise exception 'At least one tag required';end if;
  if new.type='vecino' then
   if new.rating is null or new.rating not between 1 and 5 then raise exception 'Rating required';end if;
   if new.latitude is not null or new.longitude is not null then raise exception 'Neighbor recognition has no location';end if;
   new.place_tag:=null;
  else
   if new.latitude is null or new.longitude is null then raise exception 'Place location required';end if;
   if new.rating is not null then raise exception 'Place has no neighbor rating';end if;
   new.place_tag:=new.tags[1];
  end if;
 end if;
 if (new.latitude is null)<>(new.longitude is null) then raise exception 'Both coordinates required';end if;
 if new.latitude is not null then
  if not(new.latitude between -90 and 90 and new.longitude between -180 and 180) then raise exception 'Invalid coordinates';end if;
  new.latitude:=round(new.latitude::numeric,3)::double precision;new.longitude:=round(new.longitude::numeric,3)::double precision;
 end if;
 return new;
end; $$;
drop trigger if exists normalize_recommendation_tags_before_write on public.recommendations;
drop trigger if exists round_recommendation_location_before_write on public.recommendations;
drop trigger if exists validate_v18_recommendation_before_write on public.recommendations;
create trigger validate_v18_recommendation_before_write before insert or update on public.recommendations
 for each row execute function public.validate_v18_recommendation();

create table if not exists public.active_emergencies(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 incident_type text not null check(incident_type in('sismo','huayco','incendio','robo','salud','inundacion')),
 latitude double precision,longitude double precision,
 status text not null default 'active' check(status in('active','resolved')),
 created_at timestamptz not null default now(),resolved_at timestamptz
);
alter table public.active_emergencies drop constraint if exists active_emergencies_location_pair_check;
alter table public.active_emergencies add constraint active_emergencies_location_pair_check check(
 (latitude is null and longitude is null) or
 (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);
create unique index if not exists active_emergencies_one_per_user_idx on public.active_emergencies(user_id) where status='active';
create index if not exists active_emergencies_created_at_idx on public.active_emergencies(created_at desc) where status='active';
create or replace function public.validate_v18_emergency() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status<>'active' or new.resolved_at is not null then raise exception 'New emergency must be active';end if;
  new.created_at:=now();
 else
  if old.status<>'active' or new.status<>'resolved' then raise exception 'Only resolution is allowed';end if;
  if new.id<>old.id or new.user_id<>old.user_id or new.incident_type<>old.incident_type or new.created_at<>old.created_at then raise exception 'Emergency identity is immutable';end if;
  new.resolved_at:=now();new.latitude:=null;new.longitude:=null;
 end if;
 if (new.latitude is null)<>(new.longitude is null) then raise exception 'Both coordinates required';end if;
 if new.latitude is not null then
  if not(new.latitude between -90 and 90 and new.longitude between -180 and 180) then raise exception 'Invalid coordinates';end if;
  new.latitude:=round(new.latitude::numeric,3)::double precision;new.longitude:=round(new.longitude::numeric,3)::double precision;
 end if;
 return new;
end; $$;
drop trigger if exists round_emergency_location_before_write on public.active_emergencies;
drop trigger if exists validate_v18_emergency_before_write on public.active_emergencies;
create trigger validate_v18_emergency_before_write before insert or update on public.active_emergencies
 for each row execute function public.validate_v18_emergency();
alter table public.active_emergencies enable row level security;
revoke all on public.active_emergencies from anon;
grant select,insert,update on public.active_emergencies to authenticated;
drop policy if exists "emergencies active or own read" on public.active_emergencies;
create policy "emergencies active or own read" on public.active_emergencies for select to authenticated using(status='active' or user_id=(select auth.uid()));
drop policy if exists "create own emergency" on public.active_emergencies;
create policy "create own emergency" on public.active_emergencies for insert to authenticated with check(user_id=(select auth.uid()) and status='active' and resolved_at is null);
drop policy if exists "resolve own emergency" on public.active_emergencies;
create policy "resolve own emergency" on public.active_emergencies for update to authenticated using(user_id=(select auth.uid()) and status='active')
 with check(user_id=(select auth.uid()) and status='resolved' and resolved_at is not null and latitude is null and longitude is null);
-- Realtime emite cambios de la tabla; el cliente no envía avisos arbitrarios al canal.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables)
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='active_emergencies') then
  alter publication supabase_realtime add table public.active_emergencies;
 end if;
end; $$;
commit;
notify pgrst, 'reload schema';
