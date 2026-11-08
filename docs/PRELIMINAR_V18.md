# Preliminar v18: integración y validación

Base: `origin/main` `9895ec4`, con PR #3 fusionado.
Origen de novedades: `origin/frontend/runared-v17-mapa-ubicaciones` `3000085`, actualizado con `61ccfc8` (permisos de ubicación aproximada y precisa en Android al compartir desde la app).

Limpieza opcional de datos de demo: ejecutar manualmente [LIMPIAR_PUBLICACIONES_Y_RECOMENDACIONES_DEMO.sql](../VeciRed_v14_Movil_Android/supabase/LIMPIAR_PUBLICACIONES_Y_RECOMENDACIONES_DEMO.sql) en SQL Editor. Elimina todas las publicaciones y recomendaciones; conserva cuentas, perfiles, contactos, ubicaciones y alertas. No se ejecutó en Supabase desde esta entrega.
Rama de trabajo: `frontend/vecired-v18`.

## Resultado

Se integraron Comunidad (Estanque/Actividad/Mapa), filtros compartidos, recomendaciones con etiquetas y estrellas, mapa de lugares, teléfono editable y alertas de emergencia. Se conservaron las llamadas con consentimiento, la gestión de publicaciones y el comportamiento ante desconexiones de v15.

La carpeta local mantiene su nombre anterior durante esta preliminar. El paquete web y el título de la app identifican v18. No se cambió el versionCode/versionName de Gradle, cuyo cambio había sido rechazado anteriormente, ni los iconos nativos.

## Correcciones realizadas al incorporar la fuente

- La selección de filtros determina también el icono de cada vecino y los marcadores de emergencia del mapa.
- Se mantiene una instancia estable del mapa al refrescar datos.
- El muro conserva títulos y enlaces Maps de recomendaciones antiguas.
- Las etiquetas se normalizan, se limitan a cinco y se deduplican sin distinguir mayúsculas.
- El cliente y SQL validan las coordenadas y reducen su precisión.
- Cambiar teléfono retira el consentimiento del número anterior. El teléfono se consulta por RPC propia y no se añade a listados de vecinos.
- La interfaz espera a cargar el teléfono antes de permitir guardarlo y evita guardar sobre un valor desconocido.
- El registro admite confirmación de correo activada o desactivada, según la sesión devuelta por Supabase.
- Las alertas remotas nacen de escrituras de la tabla; no dependen de broadcasts redactados por clientes.
- Realtime y la consulta periódica actualizan las alertas; se vuelven a consultar registros activos antes de notificar.
- Las alertas previas a la apertura no disparan sonidos al iniciar. Los avisos nuevos no se repiten con cada consulta.
- Se limpian suscripciones, temporizadores y sonido al salir. El aviso de diez segundos no resuelve la alerta persistida.

## Evidencia

- `npm test`: 15 pruebas correctas.
- `npm run build`: TypeScript y Vite correctos.
- `npm run android:sync` y Gradle `assembleDebug`, JDK 21: correctos.
- Instalación y apertura del APK en el emulador correctas. Se observó el título v18, la sesión existente, vecinos, filtros y las tres vistas.
- PostgreSQL 16.8 local: base desechable con dos usuarios de prueba, esquema v14, actualización v15 y recomendación antigua; incremental v18 ejecutado dos veces.
- Pruebas SQL correctas: conservación de perfiles/publicaciones/recomendaciones antiguas, privacidad del teléfono, revocación y conservación de consentimiento según cambio de número, validación/deduplicación de etiquetas, precisión de coordenadas, rechazo de autor ajeno y autorrecomendación.
- Alertas: una activa por usuario, acceso a activas, resolución solo por autor, identidad inmutable, retirada de ubicación al resolver, rechazo de acceso anónimo y pertenencia a la publicación Realtime.
- El servidor PostgreSQL local se detuvo al terminar.

Estas pruebas locales simulan `auth.uid()`; no sustituyen las pruebas remotas de Supabase Auth, WebSocket, sonido y dos cuentas reales de demostración. El SQL v18 todavía no se ha aplicado en el proyecto remoto. El aviso de alertas no disponibles antes de migrar es esperado.

## Límites de esta entrega

Comunidad demo compartida entre usuarios autenticados. Faltan membresía/aislamiento por comunidad, moderación y controles de abuso para producción. Las alertas necesitan la app abierta y no reemplazan servicios de emergencia ni garantizan entrega. La cartografía requiere Internet y el sonido depende del navegador/WebView.

Consulta [MIGRACION_V18.md](../VeciRed_v14_Movil_Android/MIGRACION_V18.md) para la actualización remota.
