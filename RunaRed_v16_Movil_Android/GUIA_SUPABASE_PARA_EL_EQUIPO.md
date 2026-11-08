# VeciRed v14 — Guía de Supabase para el equipo

## 1. Preparar proyecto
1. Crear proyecto en Supabase y guardar **Project URL** y **publishable/anon key** (nunca `service_role`).
2. En SQL Editor, sobre un proyecto **nuevo**, ejecutar `src/infrastructure/supabase-schema.sql`. Revisar todo el SQL antes.
3. En Authentication > Providers > Email, habilitar email/contraseña y configurar confirmación de correo. Para probar, verificar la dirección real del usuario.
4. Crear `.env` desde `.env.example` y colocar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Reiniciar Vite tras modificarlo.
5. Ejecutar `npm install`, `npm run typecheck`, `npm run build`, `npx cap sync android`, `npx cap open android`. Si `android/` no existe, ejecutar `npx cap add android` una sola vez.

## 2. Flujo de usuarios
- **Crear cuenta:** correo, contraseña, nombre fijo, mascota, hábitat, afición y WhatsApp opcional. `auth.signUp` envía metadatos y el trigger `handle_new_user` crea `profiles` y `private_contacts`.
- **Iniciar sesión:** `auth.signInWithPassword`; se lee `profiles` y se abre el estanque.
- **Volver a abrir la app:** `auth.getSession` restaura la sesión guardada.
- **Cerrar sesión:** `auth.signOut` y borrar caché local.
- **Nombre:** no editable en la UI y bloqueado en la BD por trigger.
- **Contacto:** los listados de vecinos NO incluyen números. Solo al tocar «Contactar por WhatsApp» se llama a `get_neighbor_whatsapp` y se abre `wa.me`. **No es privacidad absoluta:** un usuario autenticado con el UUID puede invocar la función; restringir por comunidad y añadir límites de abuso antes de uso real.

## 3. Tablas
- `profiles`: una fila por usuario, nombre, animal, hábitat, hobby, sector.
- `private_contacts`: número WhatsApp opcional, separado del perfil público.
- `posts`: muchas publicaciones por `author_id`, tipo servicio/favor/emergencia, contenido y estado.
- `sectors`: sectores vecinales (falta asignación/verificación real).

## 4. Validación entre dos dispositivos
1. Registrar dos correos diferentes y confirmar ambos.
2. Iniciar sesión en ambos; cada uno debe aparecer una vez en el estanque.
3. Publicar 2 servicios con la misma cuenta: **una mascota**, dos publicaciones.
4. Contactar una cuenta con WhatsApp y otra sin número: comprobar ambos estados.
5. Cerrar y abrir la app: debe restaurarse la sesión. Cerrar sesión explícitamente y verificar que vuelve al login.
6. Probar llamadas `tel:` y enlaces `wa.me` en Android físico; el emulador puede no tener WhatsApp.

## 5. Pendientes de seguridad antes de lanzamiento
- **Crítico:** restringir SELECT de `profiles` y `posts` y RPC de contacto a miembros verificados de la misma comunidad, mediante tablas `communities` / `memberships` y RLS.
- No considerar el campo `sector` de la UI como verificación de ubicación; validar pertenencia en backend.
- Añadir consentimiento explícito para compartir número, política de privacidad, reportes y bloqueo de usuarios.
- Validar y limitar publicación de emergencias falsas y datos sensibles; proteger endpoints contra abuso.
- Evitar exponer `service_role` en el frontend.
- Revisar disponibilidad de números oficiales y permisos de ubicación antes del despliegue.

## 6. Importante
Esta versión deja el **flujo frontend preparado**, pero requiere configurar Supabase, ejecutar SQL y probar de extremo a extremo. No afirmar que el backend está desplegado solo por tener adaptadores.
