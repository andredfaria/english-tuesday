/**
 * Renders challenges and results on the student's device (/play.html).
 * No scoring buttons — students select/submit answers only.
 */

/**
 * Render a challenge spec into #challengeArea.
 * @param {object} spec - sanitized RenderSpec (no answer field)
 * @param {(answer: string) => void} onSubmit - called when student confirms answer
 */
export function renderPlayerChallenge(spec, onSubmit) {
  const area = document.getElementById('challengeArea');
  area.innerHTML = '';

  // Prompt text
  if (spec.promptHtml) {
    const p = document.createElement('p');
    p.className = 'play-prompt';
    p.innerHTML = spec.promptHtml;
    area.appendChild(p);
  }

  // Emoji (emoji mode)
  if (spec.emojiHtml) {
    const em = document.createElement('div');
    em.className = 'play-emoji';
    em.innerHTML = spec.emojiHtml;
    area.appendChild(em);
  }

  // Multiple-choice options (sentence, oddOne, etc.)
  if (spec.options?.length) {
    const grid = document.createElement('div');
    grid.className = 'play-options';
    spec.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'play-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        // Highlight selection and lock all buttons
        grid.querySelectorAll('.play-option-btn').forEach((b) => {
          b.classList.remove('selected');
          b.disabled = true;
        });
        btn.classList.add('selected');
        onSubmit(opt);
      });
      grid.appendChild(btn);
    });
    area.appendChild(grid);
    return;
  }

  // Free-text answer (name3, rhyme, describe, translation)
  const row = document.createElement('div');
  row.className = 'play-answer-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'play-answer-input';
  input.placeholder = 'Your answer…';
  input.autocomplete = 'off';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play-submit-btn';
  btn.textContent = '✓ Confirm';

  const submit = () => {
    if (!input.value.trim()) return;
    input.disabled = true;
    btn.disabled = true;
    onSubmit(input.value.trim());
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  row.appendChild(input);
  row.appendChild(btn);
  area.appendChild(row);
}

/**
 * Show the "waiting for other team" message.
 * @param {number} activeTeam - 1 or 2
 * @param {string} team1name
 * @param {string} team2name
 */
export function renderWaiting(activeTeam, team1name, team2name) {
  const name = activeTeam === 1 ? team1name : team2name;
  document.getElementById('waitingMsg').hidden = false;
  document.getElementById('waitingText').textContent = `${name}'s turn — stand by…`;
}

/**
 * Render the round result (shown to all students after auto-score).
 * @param {{ correct: boolean, delta: number, teamAnswers: Array<{name,answer,correct}> }} result
 */
export function renderResult(result) {
  document.getElementById('resultMsg').textContent =
    result.correct ? `✅ +${result.delta} pts!` : `❌ No points this round.`;

  const list = document.getElementById('resultList');
  list.innerHTML = '';
  result.teamAnswers.forEach(({ name, answer, correct }) => {
    const li = document.createElement('li');
    li.textContent = `${correct ? '✅' : '❌'} ${name} — "${answer}"`;
    list.appendChild(li);
  });

  document.getElementById('resultArea').hidden = false;
}

/**
 * Update the score display in the game screen header.
 * @param {number} score1
 * @param {number} score2
 */
export function updatePlayScore(score1, score2) {
  document.getElementById('playScore').textContent = `🔵 ${score1}  vs  🔴 ${score2}`;
}
