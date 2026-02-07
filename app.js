// State
let players = [];
let playersPerTeam = 5;
let gameTimeMinutes = 10;
let playerQueue = []; // flat list of individual player names
let currentTeamA = null;
let currentTeamB = null;
let teamNameA = 'Time A';
let teamNameB = 'Time B';
let goalsA = 0;
let goalsB = 0;
let draftStarted = false;

// Timer
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

// Swap mode
let swapSource = null;

// --- Persistence ---

function saveState() {
  const state = {
    players,
    playersPerTeam,
    gameTimeMinutes,
    playerQueue,
    currentTeamA,
    currentTeamB,
    teamNameA,
    teamNameB,
    draftStarted,
    currentScreen: document.querySelector('.screen.active')?.id || 'screen-setup'
  };
  localStorage.setItem('futDaGalera', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('futDaGalera');
  if (!raw) return false;

  try {
    const state = JSON.parse(raw);
    players = state.players || [];
    playersPerTeam = state.playersPerTeam || 5;
    gameTimeMinutes = state.gameTimeMinutes || 10;
    playerQueue = state.playerQueue || [];
    currentTeamA = state.currentTeamA || null;
    currentTeamB = state.currentTeamB || null;
    teamNameA = state.teamNameA || 'Time A';
    teamNameB = state.teamNameB || 'Time B';
    draftStarted = state.draftStarted || false;

    document.getElementById('playersPerTeam').textContent = playersPerTeam;
    document.getElementById('gameTime').textContent = gameTimeMinutes;
    renderPlayerList();

    if (draftStarted && currentTeamA && currentTeamB) {
      renderTeamsScreen();
      const screen = state.currentScreen;
      if (screen === 'screen-match') {
        renderMatchScreen();
        resetTimerState();
        showScreen('screen-match');
      } else {
        showScreen('screen-teams');
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function clearAll() {
  localStorage.removeItem('futDaGalera');
  localStorage.removeItem('futWaiting');
  players = [];
  playerQueue = [];
  currentTeamA = null;
  currentTeamB = null;
  teamNameA = 'Time A';
  teamNameB = 'Time B';
  goalsA = 0;
  goalsB = 0;
  draftStarted = false;
  playersPerTeam = 5;
  gameTimeMinutes = 10;
  document.getElementById('playersPerTeam').textContent = '5';
  document.getElementById('gameTime').textContent = '10';
  renderPlayerList();
  clearError();
  showScreen('screen-setup');
}

// --- Setup Screen ---

function adjustNumber(id, delta) {
  const el = document.getElementById(id);
  let val = parseInt(el.textContent) + delta;
  if (id === 'playersPerTeam') {
    val = Math.max(1, Math.min(11, val));
    playersPerTeam = val;
  } else if (id === 'gameTime') {
    val = Math.max(1, Math.min(60, val));
    gameTimeMinutes = val;
  }
  el.textContent = val;
  saveState();
}

function addPlayer() {
  const input = document.getElementById('playerName');
  const name = input.value.trim();
  if (!name) return;
  if (players.includes(name)) {
    showError('Jogador já adicionado');
    return;
  }
  players.push(name);
  input.value = '';
  input.focus();
  renderPlayerList();
  clearError();
  saveState();
}

function removePlayer(name) {
  players = players.filter(p => p !== name);
  renderPlayerList();
  saveState();
}

function renderPlayerList() {
  const container = document.getElementById('playerList');
  container.innerHTML = players.map(p =>
    `<div class="player-tag">
      <span>${escapeHtml(p)}</span>
      <span class="remove" onclick="removePlayer('${escapeJs(p)}')">&times;</span>
    </div>`
  ).join('');
}

function showError(msg) {
  document.getElementById('setupError').textContent = msg;
}

function clearError() {
  document.getElementById('setupError').textContent = '';
}

// --- Draft ---

function startDraft() {
  const minPlayers = playersPerTeam * 2;
  if (players.length < minPlayers) {
    showError(`Precisa de pelo menos ${minPlayers} jogadores (${playersPerTeam} por time × 2 times)`);
    return;
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);

  currentTeamA = shuffled.slice(0, playersPerTeam);
  currentTeamB = shuffled.slice(playersPerTeam, playersPerTeam * 2);
  playerQueue = shuffled.slice(playersPerTeam * 2);

  teamNameA = 'Time A';
  teamNameB = 'Time B';
  draftStarted = true;

  renderTeamsScreen();
  showScreen('screen-teams');
  saveState();
}

function renderTeamsScreen() {
  const container = document.getElementById('teamsDisplay');
  let html = '';
  html += renderTeamCard(teamNameA, currentTeamA);
  html += renderTeamCard(teamNameB, currentTeamB);
  container.innerHTML = html;

  const queueContainer = document.getElementById('queueDisplay');
  if (playerQueue.length > 0) {
    let html = '<h3>Fila de espera</h3><div class="queue-list">';
    playerQueue.forEach((p, i) => {
      const isNext = i < playersPerTeam;
      const cls = isNext ? 'queue-player-item queue-next' : 'queue-player-item';
      html += `<div class="${cls}">${i + 1}. ${escapeHtml(p)}</div>`;
    });
    html += '</div>';
    queueContainer.innerHTML = html;
  } else {
    queueContainer.innerHTML = '';
  }
}

function renderTeamCard(title, teamPlayers) {
  return `
    <div class="team-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="players">
        ${teamPlayers.map(p => `<span>${escapeHtml(p)}</span>`).join('')}
      </div>
    </div>
  `;
}

// --- Team Name Editing ---

function editTeamName(team) {
  const current = team === 'A' ? teamNameA : teamNameB;
  const newName = prompt('Nome do time:', current);
  if (newName !== null && newName.trim() !== '') {
    if (team === 'A') {
      teamNameA = newName.trim();
    } else {
      teamNameB = newName.trim();
    }
    renderMatchScreen();
    saveState();
  }
}

// --- Goals ---

function adjustGoals(team, delta) {
  if (team === 'A') {
    goalsA = Math.max(0, goalsA + delta);
    document.getElementById('goalsA').textContent = goalsA;
  } else {
    goalsB = Math.max(0, goalsB + delta);
    document.getElementById('goalsB').textContent = goalsB;
  }
  updateResultHighlight();
}

function resetGoals() {
  goalsA = 0;
  goalsB = 0;
  document.getElementById('goalsA').textContent = '0';
  document.getElementById('goalsB').textContent = '0';
  updateResultHighlight();
}

function updateResultHighlight() {
  const btnA = document.getElementById('btnTeamA');
  const btnB = document.getElementById('btnTeamB');
  const btnD = document.getElementById('btnDraw');

  btnA.classList.remove('suggested');
  btnB.classList.remove('suggested');
  btnD.classList.remove('suggested');

  if (goalsA > goalsB) {
    btnA.classList.add('suggested');
  } else if (goalsB > goalsA) {
    btnB.classList.add('suggested');
  } else {
    btnD.classList.add('suggested');
  }
}

// --- Add player to queue (after draft) ---

function addPlayerToQueue() {
  const input = document.getElementById('queuePlayerName');
  const name = input.value.trim();
  if (!name) return;

  const allInGame = [
    ...(currentTeamA || []),
    ...(currentTeamB || []),
    ...playerQueue
  ];
  if (allInGame.includes(name)) {
    return;
  }

  if (!players.includes(name)) {
    players.push(name);
  }

  playerQueue.push(name);

  input.value = '';
  input.focus();
  renderMatchScreen();
  saveState();
}

// --- Swap Players ---

function selectPlayerForSwap(team, index) {
  if (swapSource && swapSource.team === team && swapSource.index === index) {
    swapSource = null;
    renderMatchScreen();
    return;
  }

  if (swapSource) {
    performSwap(team, index);
    return;
  }

  swapSource = { team, index };
  renderMatchScreen();
}

function selectQueuePlayerForSwap(queueIdx) {
  if (swapSource && swapSource.queueIdx === queueIdx) {
    swapSource = null;
    renderMatchScreen();
    return;
  }

  if (swapSource) {
    performSwapWithQueue(queueIdx);
    return;
  }

  swapSource = { queueIdx };
  renderMatchScreen();
}

function performSwap(targetTeam, targetIndex) {
  const src = swapSource;

  if (src.team) {
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
    const temp = srcArr[src.index];
    srcArr[src.index] = tgtArr[targetIndex];
    tgtArr[targetIndex] = temp;
  } else if (src.queueIdx !== undefined) {
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
    const temp = tgtArr[targetIndex];
    tgtArr[targetIndex] = playerQueue[src.queueIdx];
    playerQueue[src.queueIdx] = temp;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

function performSwapWithQueue(queueIdx) {
  const src = swapSource;

  if (src.team) {
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
    const temp = srcArr[src.index];
    srcArr[src.index] = playerQueue[queueIdx];
    playerQueue[queueIdx] = temp;
  } else if (src.queueIdx !== undefined) {
    const temp = playerQueue[src.queueIdx];
    playerQueue[src.queueIdx] = playerQueue[queueIdx];
    playerQueue[queueIdx] = temp;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

// --- Queue Reorder ---

function moveQueuePlayer(fromIdx, direction) {
  const toIdx = fromIdx + direction;
  if (toIdx < 0 || toIdx >= playerQueue.length) return;
  const temp = playerQueue[fromIdx];
  playerQueue[fromIdx] = playerQueue[toIdx];
  playerQueue[toIdx] = temp;
  renderMatchScreen();
  saveState();
}

// --- Navigation ---

function goBack() {
  clearInterval(timerInterval);
  timerRunning = false;
  swapSource = null;
  showScreen('screen-teams');
  renderTeamsScreen();
  saveState();
}

function goBackToSetup() {
  draftStarted = false;
  saveState();
  showScreen('screen-setup');
}

// --- Match Screen ---

function startMatch() {
  goalsA = 0;
  goalsB = 0;
  swapSource = null;
  renderMatchScreen();
  resetTimerState();
  showScreen('screen-match');
  saveState();
}

function renderMatchScreen() {
  const container = document.getElementById('matchTeams');

  function playerHtml(name, team, index) {
    const isSelected = swapSource && swapSource.team === team && swapSource.index === index;
    const cls = isSelected ? 'player-swap selected' : 'player-swap';
    return `<span class="${cls}" onclick="selectPlayerForSwap('${team}', ${index})">${escapeHtml(name)}</span>`;
  }

  container.innerHTML = `
    <div class="match-team-card">
      <h3 class="editable" onclick="editTeamName('A')">${escapeHtml(teamNameA)} ✎</h3>
      <div class="players">
        ${currentTeamA.map((p, i) => playerHtml(p, 'A', i)).join('')}
      </div>
    </div>
    <div class="vs-divider">VS</div>
    <div class="match-team-card">
      <h3 class="editable" onclick="editTeamName('B')">${escapeHtml(teamNameB)} ✎</h3>
      <div class="players">
        ${currentTeamB.map((p, i) => playerHtml(p, 'B', i)).join('')}
      </div>
    </div>
  `;

  // Score labels
  document.getElementById('scoreLabelA').textContent = teamNameA;
  document.getElementById('scoreLabelB').textContent = teamNameB;
  document.getElementById('goalsA').textContent = goalsA;
  document.getElementById('goalsB').textContent = goalsB;

  // Result buttons
  document.getElementById('btnTeamA').textContent = teamNameA + ' Venceu';
  document.getElementById('btnTeamB').textContent = teamNameB + ' Venceu';

  updateResultHighlight();

  // Queue display
  const queueContainer = document.getElementById('matchQueue');

  if (playerQueue.length > 0) {
    let html = '<h3>Fila de espera</h3><div class="queue-list">';

    playerQueue.forEach((p, i) => {
      const isNext = i < playersPerTeam;
      const isSelected = swapSource && swapSource.queueIdx === i;
      let cls = 'queue-player-row';
      if (isNext) cls += ' queue-next';

      const playerCls = isSelected ? 'player-swap selected' : 'player-swap';

      html += `<div class="${cls}">`;
      html += `<div class="queue-player-reorder">`;
      if (i > 0) {
        html += `<button class="queue-arrow" onclick="moveQueuePlayer(${i}, -1)">▲</button>`;
      }
      if (i < playerQueue.length - 1) {
        html += `<button class="queue-arrow" onclick="moveQueuePlayer(${i}, 1)">▼</button>`;
      }
      html += `</div>`;
      html += `<span class="queue-player-pos">${i + 1}.</span>`;
      html += `<span class="${playerCls}" onclick="selectQueuePlayerForSwap(${i})">${escapeHtml(p)}</span>`;
      if (isNext && i === 0) {
        html += `<span class="queue-badge">próximo time</span>`;
      }
      html += `</div>`;
    });

    html += '</div>';
    queueContainer.innerHTML = html;
  } else {
    queueContainer.innerHTML = '';
  }
}

// --- Timer ---

function resetTimerState() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerSeconds = gameTimeMinutes * 60;
  updateTimerDisplay();
  document.getElementById('btnTimer').textContent = 'Iniciar';
  document.querySelector('.timer-display').classList.remove('finished');
  document.getElementById('timer').classList.remove('timer-running');
}

function toggleTimer() {
  if (timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (timerSeconds <= 0) return;
  timerRunning = true;
  document.getElementById('btnTimer').textContent = 'Pausar';
  document.getElementById('timer').classList.add('timer-running');

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      document.getElementById('btnTimer').textContent = 'Fim!';
      document.getElementById('timer').classList.remove('timer-running');
      document.querySelector('.timer-display').classList.add('finished');
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('btnTimer').textContent = 'Continuar';
  document.getElementById('timer').classList.remove('timer-running');
}

function resetTimer() {
  resetTimerState();
  resetGoals();
}

function updateTimerDisplay() {
  const min = Math.floor(timerSeconds / 60);
  const sec = timerSeconds % 60;
  document.getElementById('timer').textContent =
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// --- Result ---

function setResult(result) {
  document.querySelectorAll('.result-buttons button').forEach(b => b.classList.remove('selected'));

  if (result === 'A') {
    document.getElementById('btnTeamA').classList.add('selected');
  } else if (result === 'B') {
    document.getElementById('btnTeamB').classList.add('selected');
  } else {
    document.getElementById('btnDraw').classList.add('selected');
  }

  setTimeout(() => processResult(result), 600);
}

function processResult(result) {
  if (result === 'draw') {
    const allPlayers = [...currentTeamA, ...currentTeamB].sort(() => Math.random() - 0.5);
    currentTeamA = allPlayers.slice(0, playersPerTeam);
    currentTeamB = allPlayers.slice(playersPerTeam, playersPerTeam * 2);

    resetGoals();
    renderMatchScreen();
    resetTimerState();
    saveState();
    return;
  }

  let winner, loser, winnerName;
  if (result === 'A') {
    winner = currentTeamA;
    loser = currentTeamB;
    winnerName = teamNameA;
  } else {
    winner = currentTeamB;
    loser = currentTeamA;
    winnerName = teamNameB;
  }

  // Loser players go individually to end of queue
  playerQueue.push(...loser);

  // Build next team from front of queue
  if (playerQueue.length >= playersPerTeam) {
    const nextTeam = playerQueue.splice(0, playersPerTeam);
    currentTeamA = winner;
    currentTeamB = nextTeam;
    teamNameA = winnerName;
    teamNameB = 'Novo Time';
  } else {
    // Not enough players for a new team, winner stays, loser comes back
    // (this happens with exactly 2 teams and no extras)
    const backPlayers = playerQueue.splice(0, playerQueue.length);
    currentTeamA = winner;
    currentTeamB = backPlayers.length === playersPerTeam
      ? backPlayers
      : loser; // fallback: same loser returns
    teamNameA = winnerName;
    teamNameB = 'Novo Time';
    // If we used loser as fallback, don't leave them in queue
    if (currentTeamB === loser) {
      playerQueue = [];
    }
  }

  resetGoals();
  swapSource = null;
  renderMatchScreen();
  resetTimerState();
  saveState();
}

// --- Navigation ---

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- Util ---

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeJs(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
});
