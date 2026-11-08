# Mapas de v17 integrados en v15

Origen: rama `frontend/runared-v17-mapa-ubicaciones`, commit `11af62e`. La rama v16 seguía en `c2d8240`.

## Integración

- Selector Estanque/Mapa, MapLibre y cartografía OpenFreeMap.
- Ubicación opcional al publicar, selección de punto en mapa.
- Ubicaciones temporales voluntarias, retiro y renovación.
- Se conservan llamadas con consentimiento, resolver/eliminar, reconexión, recomendaciones y mascotas antiguas.
- El mapa y su librería se cargan al abrirlos, separados del código inicial.
- El mapa conserva su instancia y vista al actualizar datos; los popups insertan texto mediante DOM, sin HTML de usuarios.
- Actualización cada 15 segundos mientras el mapa está visible. Los puntos vencidos se filtran también en la interfaz.
- Supabase valida rango, emparejamiento y aproximación de coordenadas; fija la caducidad con su reloj.
- Resolver una publicación quita las coordenadas en el servidor.
- La lectura de publicaciones sigue funcionando antes de añadir las columnas nuevas.
- No se modificó el número de versión nativo que había sido rechazado previamente.

## SQL

Archivo para la base existente: [ACTUALIZAR_BASE_EXISTENTE_V15.sql](../VeciRed_v14_Movil_Android/supabase/ACTUALIZAR_BASE_EXISTENTE_V15.sql).

Reúne cuatro migraciones en una transacción; no vuelve a crear la base. RLS protege las escrituras por autor y las ubicaciones vencidas. La limpieza física de ubicaciones vencidas requiere invocar la función o programarla; la interfaz no promete borrado físico exacto en 30 minutos.

El responsable del proyecto confirmó la ejecución manual del instalador en Supabase con “Success. No rows returned”. Esta confirmación no sustituye las pruebas funcionales entre dos cuentas. La cartografía necesita conexión a Internet y transmite las solicitudes de mapa al proveedor. Las ubicaciones son visibles para usuarios autenticados de la demo, sin aislamiento por comunidad.

## Verificación realizada

- `npm test`: 12 pruebas correctas.
- TypeScript, Vite, Capacitor y `assembleDebug`: correctos.
- APK instalado y abierto en el emulador; sesión y publicaciones existentes conservadas.
- En PostgreSQL 16.8 local se creó una base desechable que simula el esquema v14 y `auth.uid()`.
- Se aplicó el instalador dos veces con `ON_ERROR_STOP=1`.
- Pruebas SQL correctas: conservación de perfiles antiguos y publicaciones, redondeo de coordenadas, rechazo de coordenadas inválidas/incompletas, autorrecomendación prohibida, escritura de ubicación ajena denegada, caducidad y renovación de ubicación, consentimiento/revocación de llamadas, eliminación solo por autor y denegación a anónimos.
- El servidor local de pruebas se detuvo al terminar. No se usaron usuarios ni teléfonos reales en esas pruebas.
- Estas pruebas no sustituyen la comprobación remota de Supabase Auth, PostgREST y dos cuentas en dispositivos.

Los archivos `tests/sql/bootstrap-v14.sql` y `assertions-v15.sql` son exclusivamente para bases locales desechables. Nunca ejecutarlos en el proyecto remoto.
