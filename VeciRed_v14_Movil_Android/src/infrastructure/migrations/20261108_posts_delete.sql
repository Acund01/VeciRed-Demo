-- Ejecutar sobre la base v14 existente. No borra publicaciones.
begin;
drop policy if exists "posts delete owner" on public.posts;
create policy "posts delete owner" on public.posts
 for delete to authenticated using (author_id = (select auth.uid()));
commit;
