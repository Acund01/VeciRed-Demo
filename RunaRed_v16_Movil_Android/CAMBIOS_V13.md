# Cambios VeciRed v13

- El chat y las llamadas simuladas se retiraron; ahora se usa WhatsApp con número opcional de cada vecino.
- Se agregó panel de emergencias con tipos de incidentes y marcación de servicios de Perú.
- Se agregó compartir ubicación aproximada con consentimiento explícito.
- Se agregó icono de casa para volver a la bienvenida.
- Se conectaron los flujos principales de publicaciones y perfiles al adaptador Supabase cuando hay variables `.env`.
- Se actualizó el SQL de referencia con teléfonos opcionales y creación automática de perfiles.
- Se preservó el diseño del estanque, la paleta y la agrupación de una mascota por vecino.
- Se eliminaron los módulos de mensajería internos del contrato de integración.

**Limitaciones:** no se verificó build con npm en este entorno; el SQL requiere seguridad de comunidades antes de producción.
