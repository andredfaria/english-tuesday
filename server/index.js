import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// rooms: Map<code, { hostId: string|null, lastActivity: number, snapshot: object|null }>
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

io.on('connection', (socket) => {
  socket.on('create-room', () => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));
    rooms.set(code, { hostId: socket.id, lastActivity: Date.now(), snapshot: null });
    socket.join(code);
    socket.data.role = 'host';
    socket.data.roomCode = code;
    socket.emit('room-created', code);
  });

  socket.on('join-room', (code) => {
    const room = rooms.get(code);
    if (!room) { socket.emit('error', 'Room not found. Check the code and try again.'); return; }
    socket.join(code);
    socket.data.role = 'spectator';
    socket.data.roomCode = code;
    room.lastActivity = Date.now();
    // Send current snapshot so new spectator is immediately in sync
    socket.emit('room-joined', room.snapshot);
  });

  socket.on('state-update', (data) => {
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
    if (role === 'host' && roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.hostId = null;
        // Notify spectators that host is offline
        io.to(roomCode).emit('state', { ...(room.snapshot ?? {}), hostOffline: true });
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`english-tuesday server on port ${PORT}`));
