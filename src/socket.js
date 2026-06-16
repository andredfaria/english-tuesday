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

/** Interactive: student joins a room with name and team (1=Blue, 2=Red). */
export function connectAsPlayer(code, name, team) {
  const s = getSocket();
  s.connect();
  s.emit('player-join', { code: code.toUpperCase().trim(), name, team });
}

/** Interactive: student submits their answer for the current round. */
export function submitAnswer(answer) {
  getSocket().emit('submit-answer', { answer });
}

/**
 * Interactive: host broadcasts challenge to students.
 * payload: { spec (sanitized, no answer), answer, activeTeam, team1name, team2name, roundPointsFull }
 */
export function emitChallenge(payload) {
  getSocket().emit('challenge-start', payload);
}

/** Interactive: host signals the timer hit zero so server resolves the round. */
export function emitTimerExpired() {
  getSocket().emit('timer-expired');
}

/** Interactive: student receives a new challenge from the host. */
export function onChallenge(cb) {
  const s = getSocket();
  s.off('challenge');
  s.on('challenge', cb);
}

/** Interactive: teacher is notified that a student confirmed their answer. */
export function onPlayerAnswered(cb) {
  const s = getSocket();
  s.off('player-answered');
  s.on('player-answered', cb);
}

/** Interactive: all clients receive the round result after auto-scoring. */
export function onRoundResult(cb) {
  const s = getSocket();
  s.off('round-result');
  s.on('round-result', cb);
}

/** Interactive: teacher and student are notified a new player joined. */
export function onPlayerJoined(cb) {
  const s = getSocket();
  s.off('player-joined');
  s.on('player-joined', cb);
}

/** Interactive: new student receives the current player list on join. */
export function onPlayerList(cb) {
  const s = getSocket();
  s.off('player-list');
  s.on('player-list', cb);
}
