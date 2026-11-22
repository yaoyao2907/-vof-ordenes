# VOF Órdenes – Verificador SIPREM (versión GitHub)

Página estática: se sube tal cual a un repositorio y se publica con **GitHub Pages**
(Settings → Pages → Branch: `main`, carpeta `/root`). No necesita servidor.

## Cómo se usa
1. Abre la página en **Chrome o Edge** (los otros navegadores no dejan leer carpetas).
2. Arriba, toca **Conectar carpeta VOF CAMP** y escoge `G:\Mi unidad\VOF CAMP`
   (la carpeta de Google Drive para escritorio). La página lee de ahí:
   `RESULTADO`, `ORDENES`, `CAMBIOS REALIZADOS` y `VIDEOS`, y se refresca sola cada 2 minutos.
   Al volver a abrir la página puede pedir **Dar permiso a la carpeta** (un clic).
3. Toca **Claves de IA** y pon tus claves: hasta 5 de Google Gemini, 5 de OpenRouter y 5 de
   Cloudflare Workers AI (con el ID de cuenta). Se usan en ese orden; si una se queda sin cupo o
   falla, pasa sola a la siguiente. Las claves se guardan **solo en tu navegador**: no van al repositorio.

## Pestañas
- **Resultado**: el último `resultado_*.xlsx`. Clic en una orden la abre en Validar IA.
- **Validar IA**: checklist foto por foto (conos, fachada, papelógrafo, pruebas, irregularidad,
  medidor encontrado, medidor instalado, bolsa, fotos finales, constancia y otras fotos) con
  Sí / No / No aplica. Las fotos salen del PDF del acta; la IA las ordena y lee seriales y papelógrafos.
  Las siguientes órdenes de la bandeja se precargan para que abran de una.
- **Videos**, **Historial de cambios**, **Criterios**: igual que en la versión de Claude.

## Diferencias con la versión de Claude
- Lee la carpeta del computador en vez de Google Drive conectado.
- Las respuestas del checklist y las novedades de videos se guardan en **este navegador**
  (no se comparten con el equipo).
- La IA usa tus claves (Gemini / OpenRouter / Cloudflare) en vez de Claude.
  Cloudflare puede bloquear llamadas hechas desde el navegador; si pasa, usa Gemini u OpenRouter.

Archivos: `index.html` (página), `gh.js` (carpeta + IA con claves), `res.js`, `vid.js`, `chk.js`,
`est.js` y sus `.css`.
