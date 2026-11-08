# Actualización de Supabase v15 → preliminar v18

**Preparada y probada localmente. Pendiente de ejecución en el proyecto remoto.**

## Aplicar en tu base actual

Tu base ya recibió `ACTUALIZAR_BASE_EXISTENTE_V15.sql`. Ahora:

1. Abre el proyecto Supabase `vriespzrqjrpvuqkldus`.
2. Entra en **SQL Editor → New query**.
3. Copia completo **`supabase/ACTUALIZAR_V15_A_V18.sql`**.
4. Revisa el script y ejecuta **Run**.
5. Comprueba que termine correctamente y que aparezca `active_emergencies`.
6. Prueba la v18 con dos cuentas de demostración.

El script usa una transacción; no borra tablas ni usuarios. Supabase puede advertir sobre operaciones destructivas porque reemplaza restricciones, triggers y políticas. Si hay un error, conserva el mensaje completo antes de continuar.

Para esta actualización se usa el archivo incremental v18. El esquema inicial es exclusivamente para bases nuevas; los archivos de `tests/sql/` son exclusivamente para pruebas locales desechables.

## Cambios

- `get_my_whatsapp()` y `update_my_whatsapp(text)`: lectura/cambio del teléfono del usuario autenticado.
- Al cambiar o retirar el número, se desactiva `calls_enabled`. Guardar el mismo número conserva su consentimiento.
- Recomendaciones: etiquetas, estrellas de 1 a 5 para vecinos y coordenadas aproximadas para lugares. Las recomendaciones antiguas se conservan.
- `active_emergencies`: una alerta activa por usuario, ubicación opcional, resolución solo por el autor y retirada de coordenadas al resolver.
- RLS conserva lectura autenticada de la comunidad demo; las escrituras se limitan al autor.
- La tabla de alertas se añade a `supabase_realtime` cuando existe esa publicación. Verifica su presencia en **Database → Publications** si no llegan eventos.

No es necesario crear políticas para que los clientes envíen broadcasts arbitrarios. La app observa cambios de la tabla y confirma las alertas consultando la base. También consulta cada 15 segundos mientras está visible.

## Pruebas de la demo

1. Inicia sesión con dos cuentas.
2. A cambia su teléfono; confirma que las llamadas queden desactivadas y que B no lo vea en listados.
3. A habilita llamadas; B abre el marcador con ese número.
4. A publica un reconocimiento con etiquetas y estrellas; B lo ve en el muro.
5. A recomienda un lugar con punto; B abre su mapa.
6. En una prueba coordinada, A activa una alerta. B, con la app abierta, debe recibir un aviso de hasta diez segundos.
7. A marca su alerta como resuelta; desaparece del mapa y sus coordenadas quedan vacías.
8. B no puede resolver alertas de A.
9. Verifica las vistas Actividad/Mapa con los mismos filtros.

El sonido depende del navegador/WebView y de la interacción previa. Esta versión no entrega push con la app cerrada. Estas pruebas deben realizarse como simulación conocida por el equipo.

La configuración de confirmación de correo sigue siendo la que elijas en Supabase. La app detecta si el registro devuelve una sesión y ajusta su flujo; no cambia Auth ni RLS automáticamente.
