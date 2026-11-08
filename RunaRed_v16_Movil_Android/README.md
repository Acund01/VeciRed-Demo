# RunaRed v17 — prototipo local del mapa

Rama experimental basada en RunaRed v16. Añade un selector superior entre estanque y mapa, ubicaciones temporales optativas con duración de 30 minutos y puntos opcionales en avisos de servicio, favor o emergencia. El mapa usa MapLibre y OpenFreeMap con datos de OpenStreetMap.

```bash
npm install
npm run dev
```

Sin Supabase, las publicaciones y ubicaciones de demostración quedan guardadas solo en este navegador. Para compartir entre cuentas, configura `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y aplica ambas migraciones al proyecto de pruebas existente: `supabase/MIGRATION_v17_SHARED_LOCATIONS.sql` y `supabase/MIGRATION_v17_POST_LOCATIONS.sql`.

Las ubicaciones temporales y los puntos seleccionados para avisos se redondean en el cliente y también en la base de datos a unos 100 m. Los puntos de avisos se muestran en el mapa mientras la publicación esté activa, bajo las políticas de lectura actuales de publicaciones (usuarios autenticados). Las ubicaciones temporales son visibles a cualquier usuario autenticado, independientemente del sector; vencen a los 30 minutos y pueden retirarse antes. No subir `.env` ni claves `service_role`.
