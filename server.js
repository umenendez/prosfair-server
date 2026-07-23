const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX_PATH = path.join(__dirname, 'public', 'prosfair.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html' || req.url === '/prosfair.html') {
    fs.readFile(INDEX_PATH, (err, data) => {
      if (err) { res.writeHead(500); res.end('No se pudo cargar la página.'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado.');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

// code -> { state, sockets: { p1: ws|null, p2: ws|null } }
const rooms = new Map();

function broadcast(code, msg) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const role of ['p1', 'p2']) {
    const s = room.sockets[role];
    if (s && s.readyState === 1) s.send(data);
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'create') {
      let code = msg.code;
      if (!code || rooms.has(code)) {
        do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (rooms.has(code));
      }
      const state = msg.state;
      state.code = code;
      rooms.set(code, { state, sockets: { p1: ws, p2: null } });
      ws.roomCode = code; ws.role = 'p1';
      send(ws, { type: 'created', code, role: 'p1', state });
      return;
    }

    if (msg.type === 'join') {
      const room = rooms.get(msg.code);
      if (!room) { send(ws, { type: 'error', message: 'No se encontró esa partida.' }); return; }
      if (room.sockets.p2 && room.sockets.p2.readyState === 1) {
        send(ws, { type: 'error', message: 'Esa partida ya tiene dos jugadores conectados.' });
        return;
      }
      room.sockets.p2 = ws;
      ws.roomCode = msg.code; ws.role = 'p2';
      if (room.state.players && room.state.players.p2) room.state.players.p2.joined = true;
      send(ws, { type: 'joined', code: msg.code, role: 'p2', state: room.state });
      broadcast(msg.code, { type: 'state', state: room.state });
      return;
    }

    if (msg.type === 'rejoin') {
      const room = rooms.get(msg.code);
      if (!room) { send(ws, { type: 'error', message: 'No se encontró esa partida.' }); return; }
      room.sockets[msg.role] = ws;
      ws.roomCode = msg.code; ws.role = msg.role;
      send(ws, { type: 'rejoined', code: msg.code, role: msg.role, state: room.state });
      return;
    }

    if (msg.type === 'update') {
      const room = rooms.get(msg.code);
      if (!room) return;
      room.state = msg.state;
      broadcast(msg.code, { type: 'state', state: room.state });
      return;
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (room && room.sockets[ws.role] === ws) room.sockets[ws.role] = null;
    }
  });
});

// Clean up empty/abandoned rooms every 30 minutes to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const p1gone = !room.sockets.p1 || room.sockets.p1.readyState !== 1;
    const p2gone = !room.sockets.p2 || room.sockets.p2.readyState !== 1;
    if (p1gone && p2gone) rooms.delete(code);
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log('Prosfair escuchando en el puerto ' + PORT);
});
