# Migrar la base v14 a v15

Estos archivos se publican como parte del código. **Todavía no se han ejecutado en tu Supabase.**

## Base existente

1. Confirma que estás en el proyecto Supabase correcto y conserva una copia de seguridad.
2. Abre SQL Editor y revisa estas migraciones en orden:
   - `src/infrastructure/migrations/20261108_posts_delete.sql`
   - `src/infrastructure/migrations/20261108_call_consent.sql`
   - `src/infrastructure/migrations/20261108_v15_recommendations.sql`
3. Aplica las que aún no estén aplicadas. Los scripts admiten repetición para sus políticas y funciones. La migración nueva conserva los datos y añade la tabla `recommendations`.
4. Comprueba que siguen existiendo `profiles`, `posts` y `private_contacts`, y aparece `recommendations`.
5. Revisa que RLS esté habilitado en las tablas. No desactives RLS para evitar errores de permisos.
6. Recompila/sincroniza la app y sigue las pruebas del [informe de comparación](../docs/COMPARACION_V14_V16_Y_V15.md).

No ejecutes `supabase-schema.sql` sobre esta base: es solo para proyectos nuevos. No necesitas conectar GitHub directamente a la base; GitHub guarda los scripts y cada entorno decide cuándo aplicarlos.

Si ya se aplicó el SQL original de v16 y hay recomendaciones inválidas (por ejemplo, hacia el propio autor), las restricciones nuevas pueden rechazar la migración. La transacción se revierte: revisa esos registros antes de repetir, sin borrar datos automáticamente.

## Qué cambia

- Conserva vizcacha, alpaca y jardín; admite las nuevas opciones en perfiles y en el trigger de registro.
- Añade recomendaciones de vecino o lugar; el cliente no puede inventar otro autor.
- Solo autor autenticado puede insertar/eliminar sus recomendaciones. Lectura para usuarios autenticados, igual que la comunidad demo.
- Las llamadas continúan desactivadas por defecto hasta autorización personal. El nuevo SQL no activa permisos por nadie.
- No mueve teléfonos a `profiles` ni los publica en los listados.

## Pruebas que no cubre una compilación

Las nueve pruebas locales comprueban lógica del frontend; no demuestran RLS ni RPC remotas. Comprueba con dos cuentas la lectura, publicación de recomendaciones, denegación de autor ajeno, eliminación y autorización/revocación de llamadas.

Para una comunidad real, restringe las políticas y las funciones de contacto por membresía verificada antes del lanzamiento público.
