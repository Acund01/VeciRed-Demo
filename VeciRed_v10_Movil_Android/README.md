# VeciRed — Estanque móvil Android

**Objetivo:** aplicación móvil Android (APK) con React + TypeScript + Capacitor. El navegador es solo para previsualización durante el desarrollo; no se entrega como web pública. La misma arquitectura permite agregar iOS después.

## Qué hay en el proyecto

- Pantalla de presentación y guía sin personajes flotando fuera del modal.
- Estanque animado con filtro de servicios, favores y emergencias, paleta del prototipo.
- **Un usuario = un animal**. El módulo `src/domain/pond.ts` agrupa todas sus publicaciones bajo un solo vecino. El contador y la ficha muestran las publicaciones asociadas. Los filtros no duplican animales.
- Publicación con categorías y recursos de emergencia: agua, energía, alimentos, refugio, salud, transporte.
- Chat visual, panel de llamadas/videollamadas claramente no operativo sin WebRTC/señalización.
- Perfil: cambiar mascota, hábitat y hobby; nombre no editable.
- Modo noche, lluvia en modo emergencia y permisos de geolocalización aproximada.
- `src/infrastructure/contracts.ts`: contratos para Supabase; `supabaseGateway.ts`: adaptadores de publicaciones, perfiles y mensajes; `supabase-schema.sql`: esquema inicial con RLS (requiere endurecimiento por comunidad).

## Arquitectura

```
src/
  App.tsx                   # Coordinación de pantallas y estado de UI
  components/Mascot.tsx     # Presentación de mascota
  domain/pond.ts            # Agrupación por usuario y filtros
  models/types.ts           # Entidades del dominio
  data/demo.ts              # Datos exclusivamente de vista previa
  services/location.ts      # Geolocalización nativa
  services/repository.ts    # Persistencia local de demostración
  infrastructure/
    contracts.ts            # Interfaces para el backend
    supabase.ts             # Cliente y autenticación
    supabaseGateway.ts      # Implementaciones Supabase
    supabase-schema.sql     # SQL de referencia y RLS inicial
  styles.css                # Diseño móvil
```

## Requisitos en Windows

1. Node.js 22 o superior, Android Studio con Android SDK y Android SDK Platform Tools.
2. Extraer ZIP, abrir Git Bash o terminal dentro de esta carpeta.
3. `npm install`
4. `npm run typecheck`
5. `npm run build`
6. `npx cap add android` (solo la primera vez; genera `android/`)
7. `npx cap sync android`
8. `npx cap open android`
9. Esperar sincronización Gradle. Conectar teléfono con depuración USB o crear emulador.
10. Android Studio → **Build > Build Bundle(s) / APK(s) > Build APK(s)**. APK debug en `android/app/build/outputs/apk/debug/app-debug.apk`.

Tras editar React, ejecutar `npm run android:sync` para actualizar los archivos de la aplicación Android. **No** ejecutar `cap add android` de nuevo si la carpeta ya existe.

## Supabase: integración del equipo de backend

1. Crear proyecto Supabase y configurar Auth (correo + contraseña) y confirmación de correo según requisitos.
2. Revisar y aplicar `src/infrastructure/supabase-schema.sql` en una base de pruebas; el equipo de backend debe reforzar políticas por sector, creación segura de conversaciones, verificación de vecinos, protección contra spam, moderación, índices y realtime.
3. Copiar `.env.example` a `.env` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave pública). **Nunca poner service_role en el frontend**.
4. `src/infrastructure/supabase.ts` contiene el flujo real de login/registro. Si no hay credenciales se ofrece **explorar demostración** claramente señalizada.
5. Sustituir en `App.tsx` las lecturas y escrituras de `src/services/repository.ts` y `src/data/demo.ts` por los adaptadores de `src/infrastructure/supabaseGateway.ts`. Para conversaciones reales hay que crear una conversación y sus miembros con una función segura de backend y pasar su UUID al adaptador de mensajes; el ID del vecino **no** es un ID de conversación.
6. Definir el sector con un servicio de proximidad: coordenadas privadas del usuario → zona aproximada. **No publicar latitud/longitud exactas ni ubicaciones de domicilios.**
7. El backend deberá sincronizar perfiles, publicaciones, chats y presencia entre dispositivos; el frontend no debe inventar usuarios conectados, puntuaciones ni alertas reales.

## Alcance y límites

Esta entrega es un **frontend móvil completo a nivel de pantallas e interacciones principales**, con interfaces y adaptadores iniciales para Supabase, **no una app backend conectada**. Los datos de demostración son locales; chat entre dos dispositivos, llamadas/videollamadas, reputación verificable y presencia real requieren trabajo adicional. Los emojis son mascotas provisionales: sustituir `src/components/Mascot.tsx` por ilustraciones finales si se reciben los assets originales. No se incluye proyecto `android/` ni APK precompilado porque dependen de generar el proyecto nativo y ejecutar Gradle en Android Studio.

**No se pudo realizar `npm install` ni compilar en este entorno** (sin acceso efectivo a dependencias de npm). Verificar `npm run typecheck` y `npm run build` en Windows antes de generar el APK.
