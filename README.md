# RunaRed · VeciRed v15

Demo Android con React, TypeScript, Vite, Capacitor y Supabase. Integra las funciones de la v14 con las mejoras de la rama v16.

## Versiones

- Esta integración: rama `frontend/vecired-v15`.
- Base v14 terminada: commit `00c93b7` en `main`.
- Origen visual y recomendaciones: `origin/frontend/runared-v16`, commit `c2d8240`.
- Respaldo v10: `frontend/vecired-v10`.

El código de la v15 sigue en **`VeciRed_v14_Movil_Android/`** para conservar la configuración local de Android Studio. La versión del paquete web es 15.0.0; el identificador Android continúa siendo `com.vecired.app`.

[Comparación e integración](docs/COMPARACION_V14_V16_Y_V15.md) · [Migración Supabase](VeciRed_v14_Movil_Android/MIGRACION_V15.md)

## Qué incluye

- Una mascota por vecino; servicios, favores y ayuda comunitaria.
- Resolver publicaciones propias, conservar historial y eliminar con confirmación.
- Actualización cada 15 segundos, indicador de carga y aviso de desconexión que conserva los datos visibles.
- WhatsApp y apertura del marcador telefónico con consentimiento independiente para llamadas.
- Identidad RunaRed, seis mascotas animadas, seis fondos, navegación inferior y modo noche.
- Compatibilidad con vizcacha, alpaca y jardín de los perfiles antiguos.
- Recomendaciones de vecinos y lugares, reconocimiento sin valoraciones ficticias y enlaces validados de Google Maps.
- Confirmación antes de activar la vista de ayuda de emergencia.

## Abrir el proyecto

```bash
git clone --branch frontend/vecired-v15 https://github.com/Acund01/VeciRed-Demo.git
cd VeciRed-Demo/VeciRed_v14_Movil_Android
npm ci
npm run dev
```

Requiere Node.js 22.18+ o compatible, Android Studio y JDK 21 para Android. En PowerShell se puede usar `npm.cmd`.

Crea `.env` desde `.env.example` con la URL base del proyecto Supabase y su clave pública. No añadas `/rest/v1/` a la URL. Nunca uses `service_role` en el frontend. Sin variables Supabase se utiliza una demo local.

## Mapas y ubicaciones integrados

La v15 incorpora mapa vecinal, puntos opcionales en publicaciones y ubicaciones voluntarias durante 30 minutos de la rama v17. Consulta [el informe de integración](docs/ACTUALIZACION_MAPAS_V15.md).

## Supabase existente: siguiente paso pendiente

El instalador completo está en **`supabase/ACTUALIZAR_BASE_EXISTENTE_V15.sql`**. Se probó en PostgreSQL local, pero sigue **sin ejecutar en la base remota**. Revisa [MIGRACION_V15.md](VeciRed_v14_Movil_Android/MIGRACION_V15.md). No repitas el esquema completo sobre las tablas actuales.

1. `20261108_posts_delete.sql`: eliminación solo por el autor.
2. `20261108_call_consent.sql`: consentimiento y consultas de llamadas.
3. `20261108_v15_recommendations.sql`: nuevos animales/hábitats, recomendaciones y RLS.
4. `20261108_v15_locations.sql`: coordenadas opcionales y ubicaciones temporales.

El instalador reúne los cuatro scripts; usa una sola opción de instalación.

Están en `src/infrastructure/migrations/`. Para un proyecto completamente nuevo se utiliza únicamente `src/infrastructure/supabase-schema.sql`, que ya incluye todo.

La demo comparte una comunidad entre usuarios autenticados. Antes de un lanzamiento público faltan membresía verificada y permisos por comunidad, moderación y controles de abuso.

## Verificación y Android

```bash
npm test
npm run build
npm run android:sync
npm run android:open
```

Selecciona JDK 21 y un emulador en Android Studio y pulsa Run. La carpeta `android/` ya está incluida.

APK de depuración:
`VeciRed_v14_Movil_Android/android/app/build/outputs/apk/debug/app-debug.apk`.

Para compilar en PowerShell desde la carpeta de la app:

```powershell
.\android\gradlew.bat -p android assembleDebug
```

En la ruta actual, que contiene `°`, se ha usado `-Pandroid.overridePathCheck=true`. Para compartir el proyecto se recomienda una ruta sencilla sin ese carácter.

La compilación web y las doce pruebas automatizadas pasaron. Las pruebas completas de recomendaciones y autorización de llamadas requieren aplicar antes las migraciones; el emulador puede abrir el marcador, pero no realiza llamadas reales.

No se publica `.env`, `node_modules/`, `dist/` ni el APK en Git. El equipo configura su `.env` o recibe el APK por separado.
