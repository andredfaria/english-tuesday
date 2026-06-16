import {
  connectAsPlayer, onChallenge, onRoundResult, onSocketError, onPlayerJoined,
  submitAnswer,
} from './socket.js';
import {
  renderPlayerChallenge, renderWaiting, renderResult, updatePlayScore,
} from './ui/playerView.js';

let myTeam = null;
let selectedTeam = null;

// ── Team selection ──
document.getElementById('teamBlueBtn').addEventListener('click', () => selectTeam(1));
document.getElementById('teamRedBtn').addEventListener('click',  () => selectTeam(2));

function selectTeam(t) {
  selectedTeam = t;
  document.getElementById('teamBlueBtn').classList.toggle('active', t === 1);
  document.getElementById('teamRedBtn').classList.toggle('active',  t === 2);
}

// ── Join ──
document.getElementById('joinBtn').addEventListener('click', join);
document.getElementById('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
document.getElementById('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

function join() {
  const code = document.getElementById('codeInput').value.trim().toUpperCase();
  const name = document.getElementById('nameInput').value.trim();
  const err = document.getElementById('joinError');
  err.hidden = true;

  if (code.length !== 4) { showError('Enter a 4-character room code.'); return; }
  if (!name)             { showError('Enter your name.'); return; }
  if (!selectedTeam)     { showError('Choose a team: Blue or Red.'); return; }

  myTeam = selectedTeam;
  document.getElementById('joinBtn').disabled = true;
  connectAsPlayer(code, name, selectedTeam);
}

// ── Server events ──

onPlayerJoined(() => {
  // Server confirmed join — switch to game screen
  document.getElementById('joinScreen').hidden = true;
  const gs = document.getElementById('gameScreen');
  gs.hidden = false;
  document.getElementById('playTeamBadge').textContent =
    myTeam === 1 ? '🔵 Blue Team' : '🔴 Red Team';
});

onChallenge((payload) => {
  // payload: { spec, activeTeam, team1name, team2name }
  document.getElementById('resultArea').hidden = true;
  document.getElementById('waitingMsg').hidden = true;
  document.getElementById('challengeArea').innerHTML = '';

  if (payload.activeTeam === myTeam) {
    renderPlayerChallenge(payload.spec, (answer) => submitAnswer(answer));
  } else {
    renderWaiting(payload.activeTeam, payload.team1name, payload.team2name);
  }
});

onRoundResult((result) => {
  document.getElementById('challengeArea').innerHTML = '';
  document.getElementById('waitingMsg').hidden = true;
  renderResult(result);
  updatePlayScore(result.score1, result.score2);
});

onSocketError((msg) => {
  document.getElementById('joinBtn').disabled = false;
  showError(msg);
});

function showError(msg) {
  const el = document.getElementById('joinError');
  el.textContent = msg;
  el.hidden = false;
}
