# Prosfair — servidor online

Servidor Node.js con WebSockets que permite a dos jugadores conectarse desde
dispositivos distintos y jugar una partida de Prosfair en tiempo real.

## Estructura

- `server.js` — servidor HTTP + WebSocket (sirve la página y sincroniza el
  estado de la partida entre los dos jugadores).
- `public/prosfair.html` — el juego (tablero, reglas, interfaz).
- `package.json` — dependencias (solo `ws`).

## Probarlo en tu propio ordenador

```bash
npm install
npm start
```

Abre `http://localhost:3000` en dos pestañas o dos navegadores distintos.
En una crea la partida, copia el código, y en la otra únete con ese código.

## Desplegarlo para que los dos jugadores accedan desde internet

Necesitas subir esta carpeta a un proveedor que ejecute Node.js de forma
persistente (no vale un hosting solo-estático, porque hace falta el proceso
del servidor corriendo para las conexiones WebSocket). Algunas opciones
sencillas y con capa gratuita:

### Opción A: Render.com
1. Sube esta carpeta a un repositorio de GitHub.
2. En Render, "New Web Service" → conecta el repositorio.
3. Build command: `npm install`. Start command: `npm start`.
4. Render asigna una URL pública (https://tu-app.onrender.com). Compártela
   con tu rival; el WebSocket funciona automáticamente sobre esa misma URL
   (usa `wss://` porque Render sirve HTTPS).

### Opción B: Railway.app
1. Sube el proyecto a GitHub (o usa `railway up` con la CLI).
2. Railway detecta Node.js automáticamente y ejecuta `npm start`.
3. Genera un dominio público desde la pestaña "Settings" del servicio.

### Opción C: Fly.io
1. Instala `flyctl` y ejecuta `fly launch` dentro de esta carpeta.
2. Acepta la configuración por defecto para una app Node.js.
3. `fly deploy` la sube; `fly open` te da la URL pública.

### Opción D: tu propio VPS
1. Copia la carpeta al servidor (`scp` o `git clone`).
2. `npm install --production`.
3. Ejecuta con un gestor de procesos para que siga vivo, por ejemplo:
   ```bash
   npm install -g pm2
   pm2 start server.js --name prosfair
   ```
4. Pon Nginx (u otro proxy) delante para servir HTTPS y así el navegador
   pueda usar `wss://` sin avisos de contenido inseguro.

## Notas

- El estado de las partidas se guarda en memoria del proceso: si el servidor
  se reinicia, las partidas en curso se pierden. Para algo más duradero
  habría que añadir una base de datos (Redis o similar); dímelo si lo
  quieres para la siguiente iteración.
- Si un jugador recarga la página, puede recuperar su sitio en la partida
  con el código y el botón "Soy Jugador 1 / Soy Jugador 2" en la pantalla
  de inicio.
- El servidor no valida ni limita cuántas partidas se crean; para un uso
  entre amigos no hace falta, pero si lo abres al público en general
  convendría añadir límites básicos.
