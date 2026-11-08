> **Versión v14:** Consulta primero `GUIA_SUPABASE_PARA_EL_EQUIPO.md`. El número WhatsApp se almacena en `private_contacts`, no en `profiles`. El SQL v14 es para una base NUEVA, no para ejecutar encima del esquema v13 sin migración.

# VeciRed v13 — frontend móvil Android (Capacitor)

Esta versión parte del **ZIP v10 proporcionado por el equipo**. Conserva el diseño del estanque, filtros, mascotas, publicaciones, hábitats y modo noche. No es Expo ni Flutter. El navegador se usa solo para desarrollo; la entrega es la app Android.

## Cambios del frontend

- Emergencias: botón superior con sismo, huayco, incendio, robo, inundación y urgencia médica; recomendaciones y enlaces `tel:` a Policía 105, Bomberos 116, Defensa Civil 115 y SAMU 106 (cobertura según localidad). **La app no realiza llamadas automáticamente.** Verificar números/cobertura antes de la entrega pública.
- Compartir ubicación: permiso de GPS al tocar el botón, redondeo a ~0.01° (ubicación aproximada), hoja nativa de compartir o WhatsApp como alternativa. **No se guarda ni publica la ubicación en Supabase.**
- WhatsApp: sin chat, audio ni videollamadas internas. Contacto mediante `wa.me` solo si el vecino optó por facilitar su número peruano válido. No se muestran contactos falsos en demo.
- Icono de casa: vuelve a la bienvenida, **no cierra la sesión**. Cerrar sesión es una acción distinta en el perfil.
- Una mascota por vecino, independientemente de sus publicaciones. Mantiene la paleta y diseño del prototipo.
- Con credenciales Supabase se habilita registro/inicio de sesión y lectura/creación de publicaciones reales; sin credenciales se ofrece demo local. La demo NO es un backend real.

## Instalar y ejecutar Android

1. Instalar Node.js, Android Studio y Android SDK.
2. Abrir terminal en la carpeta donde está `package.json`.
3. `npm install`
4. `npm run typecheck`
5. `npm run build`
6. `npx cap add android` **solo si no existe** la carpeta `android/`.
7. `npx cap sync android`
8. `npx cap open android`
9. En Android Studio elegir `Medium Phone API` (emulador) y configuración `app`; pulsar Run ▶. No se necesita cable USB.
10. Para generar APK debug: Android Studio > Build > Build APK(s). La ruta habitual es `android/app/build/outputs/apk/debug/app-debug.apk`.

**Al modificar el frontend:** ejecutar `npm run android:sync` antes de volver a compilar en Android Studio. Si se está usando una carpeta `android/` anterior, respaldarla y ejecutar `npx cap sync android` en ella.

## Guía para el compañero de Supabase

### Paso 1: crear el proyecto

Crear proyecto en Supabase > Project Settings > API. Copiar **Project URL** y **publishable key/anon key** (nunca `service_role`). Crear `.env` desde `.env.example`:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

Las variables `VITE_` se incluyen en la app compilada: **solo claves públicas**. Configurar Auth > Providers > Email. Para las pruebas decidir si se exige confirmación de correo; si se exige, cada vecino debe confirmar antes de iniciar sesión.

### Paso 2: esquema SQL

Abrir `src/infrastructure/supabase-schema.sql` y ejecutarlo en **SQL Editor de un proyecto nuevo de pruebas**. El script crea `profiles`, `posts`, trigger de creación de perfil y RLS inicial. No aplicarlo directamente a una base que ya tenga esas tablas: habría que hacer migraciones.

### Paso 3: contratos ya usados por el frontend

| Acción | Implementación | Tabla / campo |
|---|---|---|
| Crear cuenta | `src/infrastructure/supabase.ts` → `signUp` | Supabase Auth; trigger crea `profiles` |
| Iniciar sesión | `signIn` y `restoreSession` | Auth + `profiles` |
| Mascota, hábitat, hobby | `profileGateway.updatePreferences` | `profiles.animal`, `habitat`, `hobby` |
| WhatsApp opcional | Metadatos de registro y perfil | `profiles.phone` (formato `519XXXXXXXX`) |
| Vecinos del estanque | `neighborhoodGateway.listNeighbors` | `profiles` |
| Publicaciones | `listPosts`, `createPost`, `closePost` | `posts` |
| Filtros / una mascota | `src/domain/pond.ts` | Agrupa por `authorId`, sin duplicar mascotas |
| Ubicación compartida | `src/services/location.ts` y `external.ts` | **No persiste en DB** |
| Emergencias / números | `src/data/emergencies.ts` | Datos locales, no requieren backend |

### Paso 4: pruebas de integración

1. Crear dos cuentas con correos distintos; confirmar email si está activado.
2. Comprobar que cada registro crea exactamente una fila `profiles`.
3. Iniciar sesión con A, publicar un servicio y un favor. Comprobar que se muestra **una sola mascota** para A.
4. Iniciar sesión con B; verificar que ve las publicaciones y que el botón WhatsApp solo se habilita si A compartió un número.
5. Comprobar RLS: B no debe poder modificar las publicaciones de A.
6. Verificar que la ubicación no se almacena en Supabase y que el teléfono no se muestra a usuarios anónimos.
7. Probar la app en emulador y dispositivo físico antes de entregar APK.

### Seguridad y funcionalidades pendientes de producción

**Importante:** el SQL incluido es un **punto de partida**, no seguridad de producción. Actualmente las políticas de lectura permiten a cualquier usuario autenticado consultar perfiles y publicaciones. Antes de desplegar VeciRed para vecinos reales se debe implementar: comunidades/sectores verificados, membresía y RLS por comunidad, consentimiento y privacidad de teléfonos, moderación, validación de emergencias, anti-spam, bloqueo/denuncias, control de abuso y revisión de políticas de datos personales. No presentar indicadores demo como usuarios realmente conectados.

Los enlaces de WhatsApp y `tel:` dependen de aplicaciones/servicios del teléfono; probarlos en un dispositivo físico. El emulador puede no tener WhatsApp instalado ni servicio telefónico.

## Estructura

- `src/App.tsx`: interfaz y coordinación de estado (vistas móviles).
- `src/components/Mascot.tsx`: presentación del animal.
- `src/domain/pond.ts`: agrupación y filtros.
- `src/models/types.ts`: modelos TypeScript.
- `src/data/emergencies.ts`: incidentes y teléfonos.
- `src/services/location.ts`: geolocalización.
- `src/services/external.ts`: WhatsApp y compartir ubicación.
- `src/services/repository.ts`: almacenamiento local de demo.
- `src/infrastructure/supabase.ts`: cliente y autenticación.
- `src/infrastructure/supabaseGateway.ts`: adaptadores de tablas.
- `src/infrastructure/supabase-schema.sql`: SQL inicial.

## Verificación

Se revisó la sintaxis de los archivos TS/TSX. **No se logró instalar dependencias en este entorno**, por lo que el `npm run build` y las pruebas en Android Studio deben realizarse localmente antes de afirmar que la app compila sin errores.
