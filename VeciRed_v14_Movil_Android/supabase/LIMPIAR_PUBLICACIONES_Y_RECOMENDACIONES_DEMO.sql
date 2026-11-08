-- Ejecutar manualmente en Supabase > SQL Editor del proyecto de la demo.
-- Borra TODAS las publicaciones y recomendaciones, incluidas las resueltas.
-- Conserva cuentas, perfiles, contactos, ubicaciones y alertas de emergencia.
-- Es independiente de la migración V15 -> V18. No desactiva RLS.
-- Tras COMMIT, estos registros no se pueden recuperar desde esta consulta.
begin;

with eliminadas as (
  delete from public.recommendations returning id
)
select count(*) as recomendaciones_eliminadas from eliminadas;

with eliminadas as (
  delete from public.posts returning id
)
select count(*) as publicaciones_eliminadas from eliminadas;

commit;
