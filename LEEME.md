# VOF Órdenes: versión para GitHub Pages (IA gratis y Google Drive directo)

## Archivos (súbelos todos a la raíz del repositorio)
index.html, gratis.js, res.js, vid.js, est.js, res.css, vid.css y est.css

## 1. Claves de IA (gratis)
- Gemini (principal): https://aistudio.google.com/apikey
- Groq (respaldo): https://console.groq.com/keys
- OpenRouter (último recurso): https://openrouter.ai/keys

Si una IA se queda sin cupo, la página pasa sola a la siguiente.

## 2. Google Drive (una sola vez en Google Cloud)
1. Entra a https://console.cloud.google.com y crea un proyecto (por ejemplo "VOF Ordenes").
2. Ve a APIs y servicios → Biblioteca, busca **Google Drive API** y dale a Habilitar.
3. Ve a APIs y servicios → Pantalla de consentimiento de OAuth: elige "Externo", ponle un nombre y tu correo, y déjala en modo **Prueba**. En "Usuarios de prueba" agrega tu correo y el de cada analista que vaya a usar la página.
4. Ve a APIs y servicios → Credenciales → Crear credenciales → **ID de cliente de OAuth** → tipo "Aplicación web".
   En "Orígenes autorizados de JavaScript" pon `https://TU_USUARIO.github.io` (sin la barra del final ni el nombre del repositorio).
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

## 3. Publicarla en GitHub Pages
1. En GitHub crea un repositorio nuevo, por ejemplo `vof-ordenes`.
2. Dale a "Add file → Upload files", arrastra los 8 archivos y luego a "Commit changes".
3. Ve a Settings → Pages. En "Source" elige "Deploy from a branch", rama `main`, carpeta `/ (root)`, y guarda.
4. En uno o dos minutos queda en `https://TU_USUARIO.github.io/vof-ordenes/`.

## 4. Primer uso
1. Abre la página y dale a **⚙ IA y Drive**.
2. Pega las claves y el ID de cliente de Google, dale a **Guardar** y luego a **Probar las IA**.
3. Dale a **Conectar Google Drive** y entra con tu cuenta. Google te va a avisar que la app no está verificada: dale a "Continuar", porque la app es tuya.

## Bueno saber
- La sesión de Google dura una hora. Cuando se vence, el botón cambia a "Reconectar Google Drive": le das clic y sigue.
- Las claves, las enseñanzas del agente y las órdenes marcadas como verificadas quedan guardadas en cada navegador. Cada analista tiene que poner sus claves en su propio navegador.
- Con el repositorio público cualquiera puede ver el código, pero las claves no están ahí. Para un repositorio privado con Pages, GitHub pide plan de pago.
