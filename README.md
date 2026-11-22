# VOF Órdenes – Verificador SIPREM (versión GitHub)

La página se publica con **GitHub Pages** y lee la carpeta **VOF CAMP de tu Google Drive** por medio de un
**Apps Script** que corre con tu cuenta (el "puente"). Los analistas no inician sesión con Google:
solo escriben la **clave del equipo**.

Lo que hace el puente:
- Lee de tu Drive: `RESULTADO`, `ORDENES`, `CAMBIOS REALIZADOS` y `VIDEOS` (solo esas carpetas).
- Guarda lo que el equipo marca (checklist de Validar IA, novedades de videos) en
  `VOF CAMP/vof_pagina_datos.json`, así todos ven lo mismo.
- Llama a la IA con tus claves (5 de Gemini, 5 de OpenRouter, 5 de Cloudflare) y cambia sola de clave
  cuando una se queda sin cupo. Las claves quedan en el Apps Script: los analistas no las ven.

---

## Paso 1 · Crear el Apps Script (una sola vez, con TU cuenta, la dueña de VOF CAMP)
1. Entra a **https://script.google.com** → **Nuevo proyecto**. Arriba a la izquierda, ponle de nombre `VOF Puente`.
2. Borra todo lo que hay en `Código.gs` y pega el contenido del archivo **`apps-script/Codigo.gs`** de este zip.
   Dale al ícono de guardar (disquete).
3. A la izquierda, el engranaje **Configuración del proyecto** → abajo, **Propiedades del script** →
   **Agregar propiedad del script**, y crea estas dos:
   - `CLAVE_EQUIPO` → la clave que les vas a dar a los analistas (ej. una frase larga).
   - `CLAVE_ADMIN` → tu clave para cambiar las claves de IA (no se la des a nadie).
   Dale **Guardar propiedades del script**.
4. Vuelve al editor (ícono `< >`). Arriba, en la lista de funciones, escoge **`probar`** y dale **Ejecutar**.
   Google te pide permisos: **Revisar permisos** → tu cuenta → **Configuración avanzada** →
   **Ir a VOF Puente (no seguro)** → **Permitir**. (Sale "no seguro" porque el script es tuyo y no está publicado.)
5. Arriba a la derecha: **Implementar → Nueva implementación** → en el engranaje escoge **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   Dale **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## Paso 2 · Poner la URL en la página
1. En tu repositorio de GitHub abre **`config.js`** → el lápiz (editar).
2. Cambia `PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT` por la URL que copiaste (entre las comillas) → **Commit changes**.

## Paso 3 · Entrar y poner las claves de IA
1. Abre la página (Settings → Pages te da el link). Escribe la **clave del equipo** → **Entrar**.
2. Arriba toca **Claves de IA**, escribe tu **clave de administrador** y pega tus claves de Gemini,
   OpenRouter y Cloudflare (con el ID de cuenta). **Guardar**.
   Se usan en orden: Gemini 1→5, OpenRouter 1→5, Cloudflare 1→5. Para borrar una, escribe `-`.

A cada analista solo le das el **link** y la **clave del equipo**.

## Si cambias el Apps Script más adelante
**Implementar → Gestionar implementaciones** → lápiz → Versión: **Nueva versión** → **Implementar**.
Así la URL sigue siendo la misma y no hay que tocar `config.js`.

## Para cambiar la clave del equipo
Cámbiala en las Propiedades del script. Los analistas tendrán que escribir la nueva (botón **Salir** arriba).

---
Archivos: `index.html` (página), `config.js` (URL del puente), `gh.js` (conexión con el puente),
`res.js`, `vid.js`, `chk.js`, `est.js` y sus `.css`, y `apps-script/Codigo.gs` (va en Google, no en GitHub).
