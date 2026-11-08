# RunaRed v16 — animaciones y marca

## Recursos incorporados

- `public/assets/sprites/<animal>/walk-0.png` a `walk-3.png`: 24 fotogramas PNG RGBA, uno por cada pose de caminata de los seis animales.
- `public/assets/runared-logo.png`: logotipo con nombre **RunaRed** obtenido de la referencia aprobada.
- `public/icon.png`, `icon-192.png`, `icon-512.png`: iconos para web/PWA y referencia de icono Android.
- `src/components/Mascot.tsx`: reproduce los fotogramas mediante CSS, sin bibliotecas de animación adicionales.

## Consideraciones visuales

Los fotogramas se extrajeron de una lámina ilustrada y se eliminó el fondo claro automáticamente. Pueden existir bordes de recorte o pequeños residuos; revisar en pantalla física. Las cuatro poses representan caminata lateral en una dirección. No se han dibujado vistas frontales completas ni sprites de caminata izquierda distintos: para invertir dirección se puede usar `transform: scaleX(-1)` en la interfaz.

## Android Studio / Capacitor

```bash
npm install
npm run typecheck
npm run build
npx cap sync android
npx cap open android
```

Si no existe la carpeta `android`, ejecutar `npx cap add android` una vez, antes de `npx cap sync android`.

**Icono nativo de APK:** los iconos PNG están listos como fuentes, pero Android necesita regenerar los recursos `mipmap-*` y los iconos adaptativos en la carpeta `android` de tu compañero (que no está incluida en este ZIP). No basta con copiar `public/icon.png` para cambiar el icono del launcher. En Android Studio, usar `New > Image Asset` y seleccionar `public/icon-512.png`, o generar los recursos con Capacitor Assets.

## Supabase

Se mantienen los contratos, autenticación, gateway y migración SQL de v15. No ejecutar de nuevo las migraciones en un proyecto ya actualizado. No se ha probado esta versión contra el Supabase del equipo.

## Estado de validación

Los PNG y el ZIP se verificaron; compilación completa en Android y pruebas reales de sesión pendientes.
