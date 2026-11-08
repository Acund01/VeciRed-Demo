# RunaRe v15 — Integración y pruebas

## 1. Código Android

Mantener React + Vite + Capacitor. Ejecutar `npm install`, `npm run typecheck`, `npm run build`, `npx cap sync android`, `npx cap open android` (si existe la carpeta Android; si no, ejecutar `npx cap add android` antes de sincronizar).

## 2. Supabase YA conectado

**No ejecutar de nuevo el SQL de v14.** Realizar una copia de seguridad, revisar y ejecutar `supabase/MIGRATION_v15_RUNARE.sql` desde SQL Editor del proyecto existente. Esta migración agrega los seis animales, seis hábitats y recomendaciones. Mantener los valores de `.env` actuales. No subir `.env` ni claves secretas a GitHub.

## 3. Funcionalidades

- Seis mascotas, fondos de seis hábitats, marca RunaRe.
- Barra de navegación inferior fija: Todos / Servicios / Favores / Recomendar / Publicar.
- En ficha del propio usuario: `Tú`. Retirar publicaciones: actualización `active=false` (RLS de propietario existente).
- Recomendaciones de vecino o lugar, enlace a Maps validado; tabla `recommendations`.
- Confirmación de emergencia local. **NO envía alertas masivas ni push notifications**; requiere Edge Function y consentimiento, moderación y notificaciones para activar alertas reales.
- Salir de sesión borra los campos de correo y contraseña del estado de React; el navegador o gestor de contraseñas podría seguir ofreciendo autocompletar. Se desactiva `autocomplete`, pero no es garantía absoluta contra el gestor del dispositivo.
- El botón de perfil sustituye al de casa.

## 4. Limitaciones y trabajo pendiente

Los personajes son recortes de la lámina conceptual aprobada; su movimiento es una oscilación CSS, **no sprites con caminata izquierda/derecha**. Los hábitats son imágenes estáticas vistas desde arriba. Validar legibilidad y recortes en pantallas pequeñas.

La función RPC de WhatsApp de v14 aún permite consultar UUID de cualquier usuario autenticado. Restringir por comunidad y consentimiento antes de lanzamiento público. Lo mismo con las políticas RLS de perfiles, publicaciones y recomendaciones.

El modo emergencia es una visualización local y filtro de publicaciones; no equivale a una alerta real a todos los usuarios. Las recomendaciones todavía no tienen sistema de denuncias, moderación, reputación ponderada ni prevención de spam. Para lugares, pegar un enlace real de Google Maps. No hay geocodificación automática.

## 5. Pruebas con dos cuentas

1. Registrarse con cada una de las seis mascotas y hábitats y comprobar persistencia.
2. Crear y retirar un servicio; confirmar que deja de mostrarse en otra cuenta.
3. Recomendar un vecino y un lugar; comprobar lectura entre cuentas.
4. Comprobar que el botón Maps abre el enlace.
5. Activar y cancelar modo emergencia; confirmar que no envía notificaciones.
6. Cerrar sesión, volver al login y comprobar campos vacíos.
7. Probar barra inferior, modo noche y orientación móvil.
