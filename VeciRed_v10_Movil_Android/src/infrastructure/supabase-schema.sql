-- Reference schema for the backend team. Apply and adapt in Supabase SQL Editor.
-- Never put service_role keys in the mobile app.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 2 and 60),
 animal text not null default 'castor' check(animal in ('castor','cuy','vizcacha','alpaca')),
 habitat text not null default 'estanque' check(habitat in ('estanque','andes','jardin')),
 hobby text not null default '', sector_id uuid,
 created_at timestamptz not null default now()
);
create table if not exists public.sectors (id uuid primary key default gen_random_uuid(), name text not null, district text);
alter table public.profiles add constraint profiles_sector_fk foreign key(sector_id) references public.sectors(id);
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('servicio','favor','emergencia')),
 title text not null, body text not null, resource text,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(conversation_id,user_id)
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body) between 1 and 3000), created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
-- Basic policies; add verified neighborhood membership and moderation rules before production.
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using(true);
create policy "profile owner updates" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "profile owner inserts" on public.profiles for insert to authenticated with check(id=auth.uid());
create policy "posts readable by authenticated" on public.posts for select to authenticated using(true);
create policy "post owner inserts" on public.posts for insert to authenticated with check(author_id=auth.uid());
create policy "post owner updates" on public.posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy "members can read own membership" on public.conversation_members for select to authenticated using(user_id=auth.uid());
create policy "members can read conversations" on public.conversations for select to authenticated using(exists(select 1 from public.conversation_members m where m.conversation_id=id and m.user_id=auth.uid()));
create policy "members can read messages" on public.messages for select to authenticated using(exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
create policy "members can send own messages" on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
-- A secure server-side function should create conversations and both memberships atomically.
-- Display names should be set at account creation and not exposed as an editable profile field.
-- Automatically create a profile after auth signup. Run after tables are created.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)));
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Prevent ordinary clients from editing immutable identity fields (including display_name).
create or replace function public.protect_profile_identity() returns trigger language plpgsql as $$
begin
 if new.id<>old.id or new.display_name<>old.display_name then raise exception 'Identity fields cannot be changed'; end if;
 return new;
end; $$;
drop trigger if exists profile_identity_immutable on public.profiles;
create trigger profile_identity_immutable before update on public.profiles for each row execute function public.protect_profile_identity();
