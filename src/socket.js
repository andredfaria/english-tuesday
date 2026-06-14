import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let _socket = null;

function getSocket() {
  if (!_socket) _socket = io(WS_URL, { autoConnect: false });
  return _socket;
}

/** Host: create a new room. Resolves with the room code. */
export function connectAsHost() {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timer = setTimeout(() => {
      s.off('room-created');
      reject(new Error('Timed out waiting for room creation'));
    }, 10000);
    s.once('room-created', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
    s.connect();
    s.emit('create-room');
  });
}

/** Spectator: join an existing room with `code`. */
export function connectAsSpectator(code) {
  const s = getSocket();
  s.connect();
  s.emit('join-room', code.toUpperCase().trim());
}

/** Host: push current game state to all spectators. */
export function emitState(snapshot) {
  getSocket().emit('state-update', snapshot);
}

/** Register a callback for when the spectator successfully joins (receives initial snapshot). */
export function onRoomJoined(cb) {
  const s = getSocket();
  s.off('room-joined');
  s.on('room-joined', cb);
}

/** Register a callback for incoming state broadcasts (spectator side). */
export function onState(cb) {
  const s = getSocket();
  s.off('state');
  s.on('state', cb);
}

/** Register a callback for server errors (e.g. room not found). */
export function onSocketError(cb) {
  const s = getSocket();
  s.off('error');
  s.on('error', cb);
}
