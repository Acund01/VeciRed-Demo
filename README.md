# VeciRed · Mi estanque

Aplicación móvil Android para conectar vecinos, compartir servicios y favores, y organizar recursos de emergencia mediante un estanque virtual con mascotas.

El frontend está desarrollado con **React, TypeScript y Vite**, y se ejecuta en Android mediante **Capacitor 7**. Este repositorio incluye el proyecto nativo Android.

## Funcionalidades

- Presentación y guía de bienvenida.
- Estanque animado con filtros de servicios, favores y emergencias.
- Una mascota por vecino, agrupando sus publicaciones.
- Publicaciones con categorías y recursos de emergencia.
- Perfil con selección de mascota, hábitat y hobby.
- Modo noche y lluvia en modo emergencia.
- Geolocalización mediante un plugin nativo.
- Pantallas de chat y paneles de llamadas y videollamadas.
- Demostración con datos locales y adaptadores iniciales para Supabase.

## Estado del proyecto

Es un **frontend de demostración**. El chat entre dispositivos, las llamadas, las videollamadas, la presencia y la reputación verificable requieren integración adicional de backend. Los paneles de llamadas no realizan llamadas reales.

El cliente y los adaptadores de Supabase están incluidos, pero las operaciones principales de la demostración utilizan datos locales. Configurar las variables de entorno no sustituye la integración pendiente de los adaptadores en las pantallas.

## Requisitos

- Node.js 22 o superior y npm.
- Java JDK 21 para compilar Android.
- Android Studio con Android SDK y Platform Tools.
- Emulador Android o teléfono con depuración USB.

## Instalación

```bash
git clone https://github.com/Acund01/VeciRed-Demo.git
cd VeciRed-Demo/VeciRed_v10_Movil_Android
npm ci
```

Todos los comandos npm siguientes se ejecutan dentro de `VeciRed_v10_Movil_Android`.

En PowerShell, si la política de ejecución bloquea `npm.ps1` o `npx.ps1`, utiliza `npm.cmd` y `npx.cmd`.

## Vista previa en navegador

```bash
npm run dev
```

Abre la dirección que muestra Vite en la terminal. La vista del navegador sirve para desarrollo; algunas funciones nativas requieren Android.

## Ejecutar en Android

```bash
npm run android:sync
npm run android:open
```

En Android Studio, espera a que termine la sincronización de Gradle, selecciona un dispositivo y pulsa **Run**. En la configuración de Gradle, selecciona JDK 21.

El proyecto nativo se encuentra en `VeciRed_v10_Movil_Android/android`. Ya está incluido: no es necesario ejecutar `cap add android`.

También puedes ejecutar desde la terminal con un dispositivo disponible:

```bash
npm run android:run
```

Después de modificar React, ejecuta `npm run android:sync` para actualizar los recursos de la app Android.

## Generar un APK de depuración

```bash
npm run android:apk
```

Este script usa `gradlew.bat` y está preparado para Windows. El APK se genera en:

```text
VeciRed_v10_Movil_Android/android/app/build/outputs/apk/debug/app-debug.apk
```

Si Gradle rechaza una ruta de Windows con caracteres como `°` o tildes, utiliza una carpeta sin esos caracteres. En este entorno también se logró compilar pasando la opción de Gradle `-Pandroid.overridePathCheck=true`.

## Configuración de Supabase

1. Copia `.env.example` a `.env` dentro de `VeciRed_v10_Movil_Android`.
2. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con la URL y la clave pública de tu proyecto.
3. Revisa el esquema y las políticas en `src/infrastructure/supabase-schema.sql` antes de aplicarlos a una base de pruebas.
4. Integra los adaptadores de `supabaseGateway.ts` con las operaciones de la aplicación.

Las políticas requieren revisión y refuerzo por comunidad antes de un uso en producción. Nunca incluyas una clave `service_role` en el frontend. Los archivos `.env` están excluidos de Git.

## Estructura

```text
VeciRed_v10_Movil_Android/
├── android/                  # Proyecto nativo de Capacitor
├── public/                   # Recursos estáticos
├── src/
│   ├── App.tsx               # Pantallas y coordinación de UI
│   ├── components/           # Componentes visuales
│   ├── data/                 # Datos de demostración
│   ├── domain/               # Agrupación de vecinos y filtros
│   ├── infrastructure/       # Contratos, cliente y adaptadores Supabase
│   ├── models/               # Tipos del dominio
│   ├── services/             # Ubicación y persistencia local
│   └── styles.css            # Estilos de la aplicación
├── capacitor.config.ts
└── package.json
```

## Comprobaciones

```bash
npm run typecheck
npm run build
```

Se verificó la compilación del frontend y del APK de depuración con JDK 21, y la apertura de la pantalla inicial en un emulador Android API 37. Esta comprobación no cubre los flujos de backend ni todas las interacciones de la app.

Para más detalles de arquitectura e integración, consulta el [README de la aplicación](VeciRed_v10_Movil_Android/README.md).
