# Comparación v14, v16 e integración v15

Fuentes revisadas: v14 `00c93b7` y `origin/frontend/runared-v16` `c2d8240`.

| Área | v14 terminada | v16 revisada | Decisión v15 |
|---|---|---|---|
| Android | Proyecto nativo incluido y probado | Sin carpeta Android propia | Conservar Android v14 e identificador com.vecired.app |
| Identidad | VeciRed / Mi Estanque | RunaRed y nuevo logo | Adoptar RunaRed |
| Mascotas | Castor, cuy, vizcacha, alpaca | Seis animales con cuatro fotogramas PNG cada uno | Seis animadas; conservar vizcacha y alpaca con presentación anterior |
| Hábitats | Estanque, Andes, jardín | Seis fondos ilustrados | Añadir fondos; jardín usa el fondo de bosque sin cambiar el perfil |
| Publicaciones | Resolver, historial, eliminar y errores | Retirar mediante desactivación | Conservar gestión completa v14 |
| Sincronización | Consulta periódica, reconexión, spinner, datos conservados | Carga inicial | Conservar v14 |
| Contacto | WhatsApp y llamadas con consentimiento | WhatsApp | Conservar v14; tel abre el marcador con el número autorizado |
| Recomendaciones | No existen | Vecinos/lugares y Maps; fallos de carga ocultos | Integrar con errores visibles, reintento y consulta periódica |
| Reconocimiento | Estrellas de demostración | Reconocimiento voluntario | Sustituir estrellas ficticias |
| Emergencias | Enlaces de ayuda y filtro | Confirmación adicional | Integrar confirmación; no emite alertas masivas |
| SQL | Publicaciones y llamadas | Recomendaciones y ampliación de perfiles | Migración adicional, sin reemplazar la base existente |

## Correcciones al integrar

- Se admiten ocho identidades de mascota y siete hábitats para conservar perfiles antiguos.
- La carga de recomendaciones falla de forma visible y no bloquea las publicaciones.
- Se rechazan recomendaciones propias, títulos vacíos y enlaces fuera de Google Maps; también se imponen restricciones en SQL.
- Las políticas de recomendaciones solo permiten insertar/eliminar al autor autenticado.
- Se conserva la privacidad del teléfono: no se incluye en los listados públicos de perfiles.
- El cierre de sesión comprueba errores antes de vaciar la interfaz.
- Las funciones SQL de llamadas y la política de eliminación de v14 se conservan.
- La migración no se ha ejecutado en el proyecto Supabase remoto.

## Evidencia y límites

- `npm run build`: TypeScript y compilación Vite correctos.
- `npm test`: nueve pruebas correctas sobre filtros/historial, teléfono y recomendaciones.
- `npm run android:sync` y Gradle `assembleDebug` con JDK 21: APK generado correctamente.
- APK instalado y abierto en el emulador: sesión anterior conservada, logo/fondo/mascotas visibles y publicaciones existentes cargadas. Se abrió el formulario de recomendaciones y se comprobó que su selector excluye al propio usuario. Al faltar la migración, la lista muestra un error visible en lugar de una lista vacía.
- El script de migración se preparó y revisó estáticamente; no se afirma que haya sido ejecutado ni probado con dos cuentas.
- La carpeta local conserva su nombre v14. Rama y paquete identifican la versión integrada v15.
- El cambio de versionCode/versionName nativo fue rechazado por la herramienta. Gradle conserva sus valores anteriores; esta entrega es una demo debug y no una versión de Play Store.
- El logo se integra en la interfaz y recursos web. Los iconos nativos del launcher conservan los recursos Android de v14.

## Pruebas después de aplicar SQL

1. Con dos sesiones distintas, A publica un servicio y B lo ve sin duplicar la mascota.
2. A resuelve y luego elimina su publicación; B deja de verla. B no puede modificar publicaciones de A.
3. B recomienda a A y publica un lugar con Maps; A ve ambos.
4. Rechazar desde la API una recomendación con autor ajeno, recomendación propia o URL no permitida. Un usuario anónimo no puede leer recomendaciones.
5. A autoriza llamadas. B pulsa Llamar y se abre el marcador con el número de A. A revoca el permiso y la consulta deja de devolverlo.
6. Comprobar que los perfiles existentes conservan mascota, hábitat y publicaciones; registrar una cuenta con una mascota nueva.
7. Desconectar y reconectar; conservar datos, mostrar aviso y actualizar al volver la red.
