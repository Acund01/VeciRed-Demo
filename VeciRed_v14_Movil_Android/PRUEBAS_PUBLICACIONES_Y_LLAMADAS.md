# Pruebas de publicaciones y conexión

## Actualizar la base existente

En Supabase → SQL Editor, ejecutar una vez el contenido de:
`src/infrastructure/migrations/20261108_posts_delete.sql`

Esta migración añade DELETE solo para el autor. No borra publicaciones. No volver a ejecutar el esquema completo en una base existente. No se ha aplicado automáticamente al proyecto remoto.

Marcar como resuelta utiliza el permiso UPDATE de propietario que ya incluye el esquema v14. Para una base nueva, el esquema completo incluye también el permiso DELETE.

## Probar con dos cuentas

1. Abrir la versión actualizada en Android y en la web.
2. A publica una prueba y B espera la actualización (15 segundos).
3. A toca su mascota y marca esa publicación como resuelta. Permanece en su historial, sin contar como activa.
4. B comprueba que sale del filtro correspondiente. En Todos sigue apareciendo la mascota de A.
5. A pulsa Eliminar y cancela: la publicación permanece.
6. A confirma Eliminar: la fila desaparece de posts y de ambas interfaces tras actualizarse.
7. B no debe ver botones para resolver ni eliminar publicaciones de A. Comprobar también que RLS rechaza modificaciones o eliminaciones de A desde una sesión B.
8. A crea otra publicación: debe conservar una sola mascota.
9. Sin red, intentar una acción: el error no debe quitar la publicación de la pantalla.

## Reconexión

Desconectar Wi-Fi y datos del emulador. Debe conservarse el estanque y mostrarse el aviso. Al reconectar, aparece la rueda con «Actualizando…» en la barra de comunidad. El aviso desaparece únicamente cuando la consulta termina correctamente. Si falla, permanece la opción Reintentar.

## Comprobaciones locales

```powershell
npm.cmd run build
node --experimental-strip-types --test tests/pond.test.ts
```

## Llamadas con consentimiento

El código está integrado; la aplicación del SQL remoto se pospuso. Cuando se decida actualizar Supabase, ejecutar `src/infrastructure/migrations/20261108_call_consent.sql`, después de la migración de publicaciones. No volver a ejecutar el esquema completo.

1. Sin migración, Mi perfil debe informar que las preferencias no están disponibles, sin bloquear las publicaciones.
2. Con migración y teléfono registrado, A habilita el permiso en Mi perfil y lo verifica tras cerrar y reabrir.
3. B toca Llamar en la ficha de A. Debe abrirse el marcador con el número, sin realizar la llamada automáticamente.
4. A revoca el permiso. Un nuevo intento de B debe informar que no está autorizado.
5. Sin número, el permiso debe estar deshabilitado. Compartir WhatsApp nunca activa llamadas por sí solo.
6. B no debe poder cambiar el permiso de A mediante RPC: la función de escritura usa exclusivamente auth.uid().
7. Las consultas de llamadas requieren autenticación; un usuario anónimo no debe ejecutarlas. Los listados no contienen teléfonos.
8. Comprobar el marcador en Android con aplicación telefónica; en PC puede no haber manejador tel:.

La separación por comunidad verificada sigue pendiente, igual que para WhatsApp.

Pruebas locales del formato y apertura del marcador:
```powershell
node --experimental-strip-types --test tests/phone.test.mjs
```
