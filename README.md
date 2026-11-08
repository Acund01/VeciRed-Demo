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
- Compartir ubicación aproximada bajo petición.
- Registro, inicio de sesión, restauración de sesión y persistencia de perfiles y publicaciones mediante Supabase, una vez configurado.
- Demostración local cuando no hay credenciales Supabase.

La v14 utiliza WhatsApp para contactar: no incluye chat, llamadas ni videollamadas internas. Las publicaciones se cargan al iniciar sesión; la actualización automática entre dispositivos está pendiente. La asignación real de comunidad y las políticas por comunidad también requieren trabajo antes de usar datos de vecinos reales.

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

## Ejecutar en Android

La v14 no incluye el proyecto nativo generado. La primera vez:

```bash
npm run build
npx cap add android
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

La v14 pasó la comprobación de TypeScript y la compilación Vite después de corregir los tipos de contactos de emergencia. Quedan pendientes la compilación del APK v14 y las pruebas de integración con un proyecto Supabase configurado y dos dispositivos.
