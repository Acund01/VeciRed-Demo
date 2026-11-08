# VeciRed · Mi estanque — v14

Aplicación móvil Android para conectar vecinos, compartir servicios y favores y coordinar ayuda comunitaria mediante un estanque virtual con mascotas.

Desarrollada con **React, TypeScript, Vite y Capacitor 7**, con integración a **Supabase** para autenticación, perfiles y publicaciones.

## Versiones

- **main:** versión actual v14, en `VeciRed_v14_Movil_Android/`.
- **frontend/vecired-v10:** [respaldo de la v10](https://github.com/Acund01/VeciRed-Demo/tree/frontend/vecired-v10).
- **frontend/vecired-v14:** rama de desarrollo de la v14.

## Funcionalidades

- Estanque con una mascota por vecino y filtros de servicios, favores y emergencias.
- Publicación de ofertas o solicitudes de apoyo.
- Perfil con mascota, hábitat y afición.
- Modo noche y panel de emergencias con enlaces telefónicos.
- Contacto externo por WhatsApp cuando el vecino proporciona su número.
- Apertura del marcador telefónico, con permiso independiente que el vecino puede habilitar o revocar desde su perfil.
- Resolver publicaciones propias y eliminarlas con confirmación; las resueltas quedan en el historial del autor.
- Compartir ubicación aproximada bajo petición.
- Registro, inicio de sesión, restauración de sesión y persistencia de perfiles y publicaciones mediante Supabase, una vez configurado.
- Demostración local cuando no hay credenciales Supabase.

La v14 utiliza WhatsApp y el marcador del teléfono para contactar; no incluye chat, audio ni videollamadas dentro de la aplicación. El estanque consulta perfiles y publicaciones cada 15 segundos mientras está visible y al volver a la app o recuperar conexión. Esta actualización periódica no requiere habilitar Realtime; si falla, conserva los datos visibles y permite reintentar. La asignación real de comunidad y las políticas por comunidad también requieren trabajo antes de usar datos de vecinos reales.

## Requisitos

- Node.js 22 o superior y npm.
- Android Studio, Android SDK y Platform Tools.
- JDK 21 para compilar Android.
- Emulador o teléfono con depuración USB; para probar WhatsApp se recomienda un teléfono con esa aplicación.

## Instalación y vista previa

```bash
git clone https://github.com/Acund01/VeciRed-Demo.git
cd VeciRed-Demo/VeciRed_v14_Movil_Android
npm install
npm run dev
```

Abre la dirección que muestra Vite. Todos los comandos siguientes se ejecutan dentro de `VeciRed_v14_Movil_Android`.

En PowerShell, si se bloquea `npm.ps1` o `npx.ps1`, utiliza `npm.cmd` y `npx.cmd`.

## Configurar Supabase

Consulta la [guía de Supabase para el equipo](VeciRed_v14_Movil_Android/GUIA_SUPABASE_PARA_EL_EQUIPO.md).

1. Crea un proyecto Supabase de pruebas.
2. Revisa `src/infrastructure/supabase-schema.sql` y aplícalo a una base **nueva**. Si ya existen tablas, prepara una migración en lugar de repetir el script.
3. Habilita acceso por correo y contraseña y configura la confirmación de correo.
4. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con la URL y la clave pública.
5. Reinicia Vite o recompila y sincroniza Android después de cambiar esas variables.

El teléfono se almacena en `private_contacts` y se consulta mediante una función al contactar. Las políticas actuales permiten lecturas amplias a usuarios autenticados: falta restringirlas por comunidad verificada. Nunca incluyas claves secretas o `service_role` en el frontend.

## Actualizaciones de una base v14 existente

Las migraciones locales están preparadas, pero su aplicación al proyecto remoto queda pendiente:

1. `src/infrastructure/migrations/20261108_posts_delete.sql`: eliminación solo por el autor.
2. `src/infrastructure/migrations/20261108_call_consent.sql`: permiso de llamadas desactivado por defecto y funciones de consulta y autorización.

No ejecutar de nuevo el esquema completo sobre una base existente. Hasta aplicar la segunda migración, las preferencias y contactos de llamada indicarán que no están disponibles. Consulta [las pruebas de publicaciones y llamadas](VeciRed_v14_Movil_Android/PRUEBAS_PUBLICACIONES_Y_LLAMADAS.md).

## Ejecutar en Android

La v14 incluye el proyecto nativo en `android/`. Después de instalar las dependencias y configurar `.env`:

```bash
npm run android:sync
npm run android:open
```

En Android Studio, espera la sincronización de Gradle, selecciona JDK 21, elige un dispositivo y pulsa **Run**.

Después de modificar React:

```bash
npm run android:sync
npm run android:open
```

Ejecuta `cap add android` únicamente cuando no exista `android/`.

## Generar APK de depuración en Windows

Después de generar el proyecto nativo:

```bash
npm run android:apk
```

Resultado esperado:

```text
VeciRed_v14_Movil_Android/android/app/build/outputs/apk/debug/app-debug.apk
```

Si Gradle rechaza una ruta de Windows con caracteres como `°`, utiliza una ruta sin esos caracteres.

## Estructura

```text
VeciRed_v14_Movil_Android/
├── public/
├── src/
│   ├── App.tsx               # Pantallas y estado
│   ├── components/           # Mascotas
│   ├── data/                 # Demostración y contactos de emergencia
│   ├── domain/               # Agrupación y filtros
│   ├── infrastructure/       # Supabase, contratos y SQL
│   ├── models/               # Tipos
│   ├── services/             # Ubicación, WhatsApp y persistencia local
│   └── styles.css
├── capacitor.config.ts
├── GUIA_SUPABASE_PARA_EL_EQUIPO.md
└── package.json
```

## Verificación

```bash
npm run typecheck
npm run build
```

La v14 pasó la comprobación de TypeScript, la compilación Vite y la generación del APK con JDK 21. Se verificó su apertura en el emulador. En las pruebas manuales del equipo se confirmó el ingreso de una cuenta y la persistencia de una publicación en Supabase. Sigue pendiente la prueba completa entre dos dispositivos.
