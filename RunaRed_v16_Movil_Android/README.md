# RunaRed v17 — prototipo local del mapa

Rama experimental basada en RunaRed v16. Añade vistas de Estanque, Actividad y Mapa con filtros compartidos, ubicaciones temporales optativas, puntos de mapa en publicaciones y recomendaciones con etiquetas múltiples personalizables, un muro de reconocimientos vecinales con estrellas y alertas de emergencia en tiempo real con ubicación opcional. El mapa usa MapLibre y OpenFreeMap con datos de OpenStreetMap.

```bash
npm install
npm run dev
```

Sin Supabase, las publicaciones, recomendaciones, ubicaciones y alertas de demostración quedan guardadas solo en este navegador; la notificación demo solo llega a otras pestañas abiertas del mismo navegador. Para compartir entre cuentas y notificar a usuarios conectados, configura `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y aplica las migraciones en este orden al proyecto de pruebas existente: `supabase/MIGRATION_v17_SHARED_LOCATIONS.sql`, `supabase/MIGRATION_v17_POST_LOCATIONS.sql`, `supabase/MIGRATION_v17_RECOMMENDATION_LOCATIONS.sql`, `supabase/MIGRATION_v17_EMERGENCY_ALERTS.sql` y `supabase/MIGRATION_v17_PROFILE_PHONE.sql`.

Las alertas activas se difunden mediante Supabase Realtime a quienes tienen la app abierta. La notificación en pantalla y el sonido duran 10 segundos; el solicitante puede cerrarla desde el panel de Emergencias. La ubicación de emergencia es opcional y se redondea antes de mostrarse.

Las ubicaciones temporales y los puntos seleccionados para avisos se redondean en el cliente y también en la base de datos a unos 100 m. Los puntos de avisos se muestran en el mapa mientras la publicación esté activa, bajo las políticas de lectura actuales de publicaciones (usuarios autenticados). Las ubicaciones temporales son visibles a cualquier usuario autenticado, independientemente del sector; vencen a los 30 minutos y pueden retirarse antes. No subir `.env` ni claves `service_role`.
