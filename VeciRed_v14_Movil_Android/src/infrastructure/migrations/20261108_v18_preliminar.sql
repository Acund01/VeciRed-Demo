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
