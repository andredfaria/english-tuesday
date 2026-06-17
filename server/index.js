import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Origens permitidas. ALLOWED_ORIGINS (lista separada por vírgula) adiciona
// origens exatas; além disso liberamos por regex o site de produção, os deploy
// previews da Netlify (<hash>--english-tuesday.netlify.app) e dev local.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ORIGIN_REGEXES = [
  // produção + deploy previews: english-tuesday.netlify.app e <id>--english-tuesday.netlify.app
  /^https:\/\/([a-z0-9-]+--)?english-tuesday\.netlify\.app$/,
  // dev local em qualquer porta
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

function isOriginAllowed(origin) {
  if (!origin) return true; // clientes não-browser (sem header Origin)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ORIGIN_REGEXES.some((re) => re.test(origin));
}

// Healthcheck endpoint — Railway pings "/" to confirm the server is alive.
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('english-tuesday server ok');
});
const io = new Server(httpServer, {
  cors: { origin: (origin, cb) => cb(null, isOriginAllowed(origin)) },
});

// rooms: Map<code, { hostId, lastActivity, snapshot, players, currentAnswer, activeTeam, roundPointsFull, answers, roundOpen }>
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// Remove rooms inactive for more than ROOM_TTL_MS
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) rooms.delete(code);
  }
}, 60 * 60 * 1000);

function resolveRound(code) {
  const room = rooms.get(code);
  if (!room || !room.roundOpen) return;
  room.roundOpen = false;

  const activePlayers = Object.entries(room.players)
    .filter(([, p]) => p.team === room.activeTeam)
    .map(([sid]) => sid);

  const total = activePlayers.length || 1;
  const correctCount = activePlayers.filter((sid) => room.answers[sid]?.correct).length;
  const teamCorrect = correctCount >= total / 2;
  const delta = teamCorrect ? (room.roundPointsFull || 5) : 0;

  // Update snapshot scores for student display
  if (room.activeTeam === 1) room.snapshot = { ...(room.snapshot || {}), score1: (room.snapshot?.score1 || 0) + delta };
  else                        room.snapshot = { ...(room.snapshot || {}), score2: (room.snapshot?.score2 || 0) + delta };

  const teamAnswers = activePlayers.map((sid) => room.answers[sid] || {
    name: room.players[sid]?.name || 'unknown',
    answer: '(no answer)',
    correct: false,
  });

  io.to(code).emit('round-result', {
    activeTeam: room.activeTeam,
    correct: teamCorrect,
    delta,
    teamAnswers,
    score1: room.snapshot?.score1 || 0,
    score2: room.snapshot?.score2 || 0,
  });
}

io.on('connection', (socket) => {
  socket.on('error', (err) => console.error(`Socket error (${socket.id}):`, err));

  socket.on('create-room', () => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));
    rooms.set(code, {
      hostId: socket.id,
      lastActivity: Date.now(),
      snapshot: null,
      // interactive mode fields
      players: {},           // { [socketId]: { name, team } }
      currentAnswer: null,
      activeTeam: null,
      roundPointsFull: 5,
      answers: {},           // { [socketId]: { name, answer, correct } }
      roundOpen: false,
    });
    socket.join(code);
    socket.data.role = 'host';
    socket.data.roomCode = code;
    socket.emit('room-created', code);
  });

  socket.on('join-room', (code) => {
    if (typeof code !== 'string' || !/^[A-Z2-9]{4}$/.test(code)) {
      socket.emit('error', 'Invalid room code format.');
      return;
    }
    const room = rooms.get(code);
    if (!room) { socket.emit('error', 'Room not found. Check the code and try again.'); return; }
    socket.join(code);
    socket.data.role = 'spectator';
    socket.data.roomCode = code;
    room.lastActivity = Date.now();
    // Send current snapshot so new spectator is immediately in sync
    socket.emit('room-joined', room.snapshot);
  });

  socket.on('player-join', ({ code, name, team }) => {
    if (typeof code !== 'string' || !/^[A-Z2-9]{4}$/.test(code)) {
      socket.emit('error', 'Invalid room code.'); return;
    }
    const room = rooms.get(code);
    if (!room) { socket.emit('error', 'Room not found. Check the code and try again.'); return; }
    if (typeof name !== 'string' || !name.trim() || name.length > 30) {
      socket.emit('error', 'Invalid name.'); return;
    }
    if (team !== 1 && team !== 2) { socket.emit('error', 'Invalid team.'); return; }

    socket.join(code);
    socket.data.role = 'player';
    socket.data.roomCode = code;
    room.players[socket.id] = { name: name.trim(), team };
    room.lastActivity = Date.now();

    // Confirm join to student + send current player list
    socket.emit('player-joined', {});
    socket.emit('player-list', Object.values(room.players));

    // Notify teacher of new player
    if (room.hostId) io.to(room.hostId).emit('player-joined', { name: name.trim(), team });
  });

  socket.on('challenge-start', ({ spec, answer, activeTeam, team1name, team2name, roundPointsFull }) => {
    if (typeof spec !== 'object' || spec === null) return;
    if (typeof answer !== 'string') return;
    if (activeTeam !== 1 && activeTeam !== 2) return;
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;

    room.currentAnswer = answer.toLowerCase().trim();
    room.activeTeam = activeTeam;
    room.roundPointsFull = typeof roundPointsFull === 'number' ? roundPointsFull : 5;
    room.answers = {};
    room.roundOpen = true;
    room.lastActivity = Date.now();

    // Broadcast sanitized spec to all players (spec has no answer field — host already stripped it)
    Object.keys(room.players).forEach((sid) => {
      io.to(sid).emit('challenge', { spec, activeTeam, team1name, team2name });
    });
  });

  socket.on('submit-answer', ({ answer }) => {
    if (typeof answer !== 'string') return;
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || !room.roundOpen) return;
    const player = room.players[socket.id];
    if (!player) return;
    if (player.team !== room.activeTeam) return;  // inactive team cannot answer
    if (room.answers[socket.id]) return;           // already answered this round

    const correct = answer.toLowerCase().trim() === room.currentAnswer;
    room.answers[socket.id] = { name: player.name, answer, correct };

    // Notify teacher in real-time
    if (room.hostId) io.to(room.hostId).emit('player-answered', { name: player.name, correct });

    // Auto-resolve if all active team players answered
    const activePlayers = Object.entries(room.players)
      .filter(([, p]) => p.team === room.activeTeam)
      .map(([sid]) => sid);
    if (activePlayers.length > 0 && activePlayers.every((sid) => room.answers[sid])) {
      resolveRound(code);
    }
  });

  socket.on('timer-expired', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId || !room.roundOpen) return;
    resolveRound(code);
  });

  socket.on('state-update', (data) => {
    if (typeof data !== 'object' || data === null) return;
    const { role, roomCode } = socket.data;
    if (role !== 'host') return;
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.snapshot = data;
    room.lastActivity = Date.now();
    socket.to(roomCode).emit('state', data);
  });

  socket.on('disconnect', () => {
    const { role, roomCode } = socket.data ?? {};
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === 'host') {
      room.hostId = null;
      io.to(roomCode).emit('state', { ...(room.snapshot ?? {}), hostOffline: true });
    } else if (role === 'player') {
      delete room.players[socket.id];
      delete room.answers[socket.id];
      // If a round is open, check if all remaining active players have answered
      if (room.roundOpen) {
        const activePlayers = Object.entries(room.players)
          .filter(([, p]) => p.team === room.activeTeam)
          .map(([sid]) => sid);
        if (activePlayers.length === 0 || activePlayers.every((sid) => room.answers[sid])) {
          resolveRound(roomCode);
        }
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`english-tuesday server on port ${PORT}`));
