/**
 * Renders a game state snapshot into the spectator DOM.
 * @param {object} state — snapshot from buildSnapshot() in main.js
 */
export function renderSpectatorState(state) {
  // No-host banner
  document.getElementById('noHostBanner').hidden = !state.hostOffline;

  // Scores
  document.getElementById('spTeam1Name').textContent = state.team1name ?? 'Blue Team';
  document.getElementById('spTeam2Name').textContent = state.team2name ?? 'Red Team';
  document.getElementById('spScore1').textContent = state.score1 ?? 0;
  document.getElementById('spScore2').textContent = state.score2 ?? 0;

  // Active team + mode
  const activeTeamName = state.activeTeam === 1
    ? (state.team1name ?? 'Blue Team')
    : (state.team2name ?? 'Red Team');
  document.getElementById('spActiveTeam').textContent = '▶ ' + activeTeamName;
  document.getElementById('spModeTitle').textContent = state.modeTitle ?? '';

  // Timer
  const timerEl = document.getElementById('spTimer');
  const secs = state.timerSecondsLeft ?? 0;
  timerEl.textContent = secs > 0 ? secs + 's' : '--';
  timerEl.classList.toggle('urgent', secs > 0 && secs <= 10);

  // Challenge prompt + options
  if (state.spec) {
    document.getElementById('spPrompt').innerHTML = state.spec.promptHtml ?? '';
    const optionsEl = document.getElementById('spOptions');
    optionsEl.innerHTML = '';
    if (Array.isArray(state.spec.options)) {
      state.spec.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'spectator-option';
        btn.textContent = opt;
        btn.disabled = true; // spectators cannot interact
        optionsEl.appendChild(btn);
      });
    }
  }
}
