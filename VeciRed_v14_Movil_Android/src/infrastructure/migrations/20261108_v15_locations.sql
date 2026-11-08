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
