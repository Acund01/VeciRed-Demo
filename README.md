# RunaRed v18 · Preliminar

Demo Android con React, TypeScript, Vite, Capacitor y Supabase.

Esta preliminar integra el commit `3000085` de la rama `frontend/runared-v17-mapa-ubicaciones` sobre la v15 que fue fusionada en main (`9895ec4`). El trabajo está en `frontend/vecired-v18`.

La carpeta de la app conserva el nombre **`VeciRed_v14_Movil_Android/`** durante las pruebas. El paquete web es **18.0.0** y el identificador Android sigue siendo `com.vecired.app`.

## Novedades

- Comunidad con vistas **Estanque, Actividad y Mapa**, y filtros compartidos.
- Muro de recomendaciones con etiquetas personalizadas, calificación de vecinos y mapa de lugares.
- Edición privada del número de WhatsApp en el perfil. Cambiarlo retira el consentimiento de llamadas anterior.
- Alertas de emergencia con ubicación aproximada opcional, cierre por el autor y aviso visual/sonido de diez segundos.
- Realtime de cambios de la tabla y consulta periódica de respaldo; el cliente vuelve a consultar la base antes de mostrar avisos.
- Registro compatible con la confirmación de correo activada o desactivada: entra a la app si Supabase devuelve una sesión; solicita confirmar cuando corresponde.
- Se conservan mascotas antiguas, resolver/eliminar publicaciones, consentimiento independiente de llamadas, reconexión y mapa estable.

## Abrir y ejecutar

Requiere Node.js 22.18+ o compatible, Android Studio, Android SDK y JDK 21.

```bash
git clone --branch frontend/vecired-v18 https://github.com/Acund01/VeciRed-Demo.git
cd VeciRed-Demo/VeciRed_v14_Movil_Android
npm ci
npm run dev
```

Configura `.env` desde `.env.example` con la URL base y la clave pública de Supabase. Sin esas variables, se utiliza la demostración local.

```bash
npm test
npm run android:sync
npm run android:open
```

En Android Studio selecciona JDK 21 y el emulador, y pulsa Run. En PowerShell puedes usar `npm.cmd`.

APK debug: `VeciRed_v14_Movil_Android/android/app/build/outputs/apk/debug/app-debug.apk`.

En la ruta actual con el carácter `°`, la compilación se verificó con:

```powershell
.\android\gradlew.bat -p android assembleDebug -Pandroid.overridePathCheck=true
```

## Actualizar Supabase de v15 a v18

**Pendiente en la base remota.** El responsable confirmó anteriormente que ejecutó el actualizador v15.

La nueva actualización está en **`supabase/ACTUALIZAR_V15_A_V18.sql`**, dentro de la carpeta de la app. Consulta [MIGRACION_V18.md](VeciRed_v14_Movil_Android/MIGRACION_V18.md).

El script añade teléfono editable, metadatos de recomendaciones y alertas activas. Se probó dos veces sobre una base local desechable para comprobar repetición y conservación de datos. Las funciones nuevas pueden indicar que no están disponibles hasta aplicar este script.

Para una base completamente nueva se utiliza `src/infrastructure/supabase-schema.sql`, que incorpora las versiones previas.

## Verificación

- 15 pruebas automatizadas correctas.
- TypeScript, Vite, Capacitor y APK debug con JDK 21 correctos.
- APK instalado y abierto en el emulador; título v18, sesión, vecinos y vistas nuevas visibles.
- PostgreSQL 16.8 local: migración v15 → v18 aplicada dos veces; conservación de datos, teléfono privado, consentimiento, etiquetas, coordenadas, alertas, RLS y publicación Realtime comprobados.
- Faltan la ejecución de SQL v18 y las pruebas completas entre dos cuentas en Supabase.

[Informe de integración](docs/PRELIMINAR_V18.md) · [Historial de integración v15](docs/COMPARACION_V14_V16_Y_V15.md).

Esta es una demo de una comunidad compartida entre usuarios autenticados; antes de producción se requiere membresía verificada, aislamiento por comunidad y moderación. Las alertas requieren la app abierta; no incluyen notificaciones push con la app cerrada. El navegador puede impedir audio hasta que el usuario interactúe.

El número de versión y los iconos del launcher nativo conservan sus valores anteriores. La identificación v18 aparece en la interfaz y el paquete web. No se publican `.env`, dependencias instaladas, archivos compilados ni APK en Git.
