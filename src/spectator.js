import { connectAsSpectator, onRoomJoined, onState, onSocketError } from './socket.js';
import { renderSpectatorState } from './ui/spectatorView.js';

const codeInput  = document.getElementById('codeInput');
const joinBtn    = document.getElementById('joinBtn');
const joinError  = document.getElementById('joinError');
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');

joinBtn.addEventListener('click', join);
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

function join() {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    showError('Please enter a 4-character room code.');
    return;
  }
  joinBtn.disabled = true;
  joinBtn.textContent = 'Joining…';
  connectAsSpectator(code);
}

onRoomJoined((snapshot) => {
  joinScreen.hidden = true;
  gameScreen.hidden = false;
  if (snapshot) renderSpectatorState(snapshot);
});

onState((snapshot) => {
  renderSpectatorState(snapshot);
});

onSocketError((msg) => {
  joinBtn.disabled = false;
  joinBtn.textContent = 'Join';
  showError(msg);
});

function showError(msg) {
  joinError.textContent = msg;
  joinError.hidden = false;
}
