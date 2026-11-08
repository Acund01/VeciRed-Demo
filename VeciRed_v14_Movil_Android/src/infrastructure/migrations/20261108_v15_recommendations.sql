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
