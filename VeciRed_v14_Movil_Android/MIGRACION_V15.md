# Activar la v15 en Supabase

La v15 integra las novedades de `frontend/runared-v17-mapa-ubicaciones` (11af62e).
**La migración se probó en PostgreSQL 16 local. El responsable del proyecto confirmó su ejecución manual en Supabase con “Success. No rows returned”. Las pruebas funcionales remotas entre dos cuentas siguen pendientes.**

## Tu base existente

1. Abre el proyecto Supabase `vriespzrqjrpvuqkldus`.
2. Entra en **SQL Editor → New query**.
3. Abre y copia completo **`supabase/ACTUALIZAR_BASE_EXISTENTE_V15.sql`** de esta carpeta.
4. Revisa el proyecto y el script; ejecuta **Run**. La actualización usa una transacción y conserva las tablas y datos existentes.
5. Comprueba que aparecen `recommendations` y `shared_locations`, y que `posts` tiene `latitude` y `longitude`.
6. Abre la v15 recompilada y prueba con dos cuentas.

El instalador reúne las migraciones de eliminación, llamadas, recomendaciones y mapas. **No necesitas ejecutarlas además por separado.** No ejecutes `supabase-schema.sql` sobre la base actual: es exclusivamente para una base nueva.

Si el script falla, detente y revisa el error: no borres tablas ni desactives RLS para continuar. Si ya había recomendaciones inválidas, las nuevas restricciones pueden rechazarlas; la transacción evita una actualización parcial.

## Qué activa

- Eliminar publicaciones propias, con control por autor.
- Consentimiento de llamadas, desactivado por defecto. Compartir WhatsApp no activa llamadas.
- Recomendaciones y nuevos animales/hábitats, conservando perfiles antiguos.
- Puntos opcionales en publicaciones, aproximados a tres decimales (unos 100 m).
- Ubicaciones temporales voluntarias: Supabase fija 30 minutos con su reloj.
- Cada usuario puede compartir, renovar o retirar su propia ubicación. Otros no ven ubicaciones vencidas.
- Resolver una publicación elimina sus coordenadas en Supabase.
- RLS habilitado; acceso anónimo a ubicaciones y recomendaciones denegado.

La caducidad oculta ubicaciones a los demás; **no implica borrado físico exacto al minuto 30**. La función `purge_expired_shared_locations()` permite limpiar registros vencidos; programarla es un paso adicional.

La demo todavía comparte una sola comunidad entre usuarios autenticados. Antes de producción se requiere membresía verificada y RLS por comunidad para tablas y contactos.

## Pruebas en Supabase

1. A publica un servicio con punto; B lo ve en el mapa.
2. A resuelve la publicación; desaparece del mapa, conserva el historial y sus coordenadas quedan vacías.
3. A comparte ubicación: B la ve. A deja de compartir: B deja de verla en la siguiente actualización.
4. Una cuenta no puede modificar ubicaciones ni eliminar publicaciones de otra.
5. A autoriza llamadas; B abre el marcador. A revoca el permiso y B ya no obtiene el teléfono.
6. Crear una recomendación de vecino y otra de lugar; verificar persistencia entre cuentas.
7. Desconectar/reconectar: conservar publicaciones visibles y permitir reintentar.
