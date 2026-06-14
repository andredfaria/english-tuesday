import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let _socket = null;

function getSocket() {
  if (!_socket) _socket = io(WS_URL, { autoConnect: false });
  return _socket;
}

/** Host: create a new room. Resolves with the room code. */
export function connectAsHost() {
  return new Promise((resolve) => {
    const s = getSocket();
    s.once('room-created', (code) => resolve(code));
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
export function onRoomJoined(cb) { getSocket().on('room-joined', cb); }

/** Register a callback for incoming state broadcasts (spectator side). */
export function onState(cb) { getSocket().on('state', cb); }

/** Register a callback for server errors (e.g. room not found). */
export function onSocketError(cb) { getSocket().on('error', cb); }
