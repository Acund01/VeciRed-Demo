# RunaRe v15

Continuación de VeciRed v14 con diseño de mascotas, hábitats y recomendaciones.

**Empieza por `GUIA_V15_INTEGRACION.md`.** Para Supabase existente, ejecutar únicamente `supabase/MIGRATION_v15_RUNARE.sql` tras revisar y respaldar la base.

```bash
npm install
npm run typecheck
npm run build
npx cap add android  # solo si todavía no existe carpeta android
npx cap sync android
npx cap open android
```

No incluir `.env` real en Git. Las imágenes de mascotas son recortes conceptuales, con animación CSS de balanceo. Las alertas masivas aún no están implementadas.
