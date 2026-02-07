// State
let players = [];
let playersPerTeam = 5;
let gameTimeMinutes = 10;
let teams = [];
let queue = [];
let currentTeamA = null;
let currentTeamB = null;
let draftStarted = false;

// Timer
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

// --- Persistence ---

function saveState() {
  const state = {
    players,
    playersPerTeam,
    gameTimeMinutes,
    queue,
    currentTeamA,
    currentTeamB,
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
    queue = state.queue || [];
    currentTeamA = state.currentTeamA || null;
    currentTeamB = state.currentTeamB || null;
    draftStarted = state.draftStarted || false;

    // Restore UI
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
  players = [];
  teams = [];
  queue = [];
  currentTeamA = null;
  currentTeamB = null;
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
      <span class="remove" onclick="removePlayer('${escapeHtml(p)}')">&times;</span>
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

  // Shuffle players
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  // Create teams
  teams = [];
  for (let i = 0; i < shuffled.length; i += playersPerTeam) {
    const teamPlayers = shuffled.slice(i, i + playersPerTeam);
    if (teamPlayers.length === playersPerTeam) {
      teams.push(teamPlayers);
    }
  }

  // First two play, rest go to queue
  queue = teams.slice(2);
  currentTeamA = teams[0];
  currentTeamB = teams[1];
  draftStarted = true;

  renderTeamsScreen();
  showScreen('screen-teams');
  saveState();
}

function renderTeamsScreen() {
  const container = document.getElementById('teamsDisplay');
  let html = '';

  html += renderTeamCard('Time 1', currentTeamA);
  html += renderTeamCard('Time 2', currentTeamB);

  container.innerHTML = html;

  // Queue
  const queueContainer = document.getElementById('queueDisplay');
  if (queue.length > 0) {
    queueContainer.innerHTML = `
      <h3>Fila de espera</h3>
      <div class="queue-list">
        ${queue.map((t, i) => `<div class="queue-item">${i + 3}. ${t.map(escapeHtml).join(', ')}</div>`).join('')}
      </div>
    `;
  } else {
    queueContainer.innerHTML = '';
  }
}

function renderTeamCard(title, teamPlayers) {
  return `
    <div class="team-card">
      <h3>${title}</h3>
      <div class="players">
        ${teamPlayers.map(p => `<span>${escapeHtml(p)}</span>`).join('')}
      </div>
    </div>
  `;
}

// --- Add player to queue (after draft) ---

function addPlayerToQueue() {
  const input = document.getElementById('queuePlayerName');
  const name = input.value.trim();
  if (!name) return;

  // Check if already playing or in queue
  const allInGame = [
    ...(currentTeamA || []),
    ...(currentTeamB || []),
    ...queue.flat()
  ];
  if (allInGame.includes(name)) {
    return;
  }

  if (!players.includes(name)) {
    players.push(name);
  }

  // Accumulate waiting players
  let waitingPlayers = getWaitingPlayers();
  waitingPlayers.push(name);
  setWaitingPlayers(waitingPlayers);

  // If enough for a new team, create it and add to queue
  if (waitingPlayers.length >= playersPerTeam) {
    const newTeam = waitingPlayers.splice(0, playersPerTeam);
    queue.push(newTeam);
    setWaitingPlayers(waitingPlayers);
  }

  input.value = '';
  input.focus();
  renderMatchScreen();
  saveState();
}

function getWaitingPlayers() {
  const raw = localStorage.getItem('futWaiting');
  return raw ? JSON.parse(raw) : [];
}

function setWaitingPlayers(list) {
  localStorage.setItem('futWaiting', JSON.stringify(list));
}

function goBack() {
  clearInterval(timerInterval);
  timerRunning = false;
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
  renderMatchScreen();
  resetTimerState();
  showScreen('screen-match');
  saveState();
}

function renderMatchScreen() {
  const container = document.getElementById('matchTeams');
  container.innerHTML = `
    <div class="match-team-card">
      <h3>Time A</h3>
      <div class="players">
        ${currentTeamA.map(p => `<span>${escapeHtml(p)}</span>`).join('')}
      </div>
    </div>
    <div class="vs-divider">VS</div>
    <div class="match-team-card">
      <h3>Time B</h3>
      <div class="players">
        ${currentTeamB.map(p => `<span>${escapeHtml(p)}</span>`).join('')}
      </div>
    </div>
  `;

  document.getElementById('btnTeamA').textContent = 'Time A';
  document.getElementById('btnTeamB').textContent = 'Time B';

  // Queue + waiting players
  const queueContainer = document.getElementById('matchQueue');
  const waitingPlayers = getWaitingPlayers();
  const hasQueue = queue.length > 0 || waitingPlayers.length > 0;

  if (hasQueue) {
    let html = '<h3>Fila de espera</h3><div class="queue-list">';
    queue.forEach((t, i) => {
      html += `<div class="queue-item">${i + 1}. ${t.map(escapeHtml).join(', ')}</div>`;
    });
    if (waitingPlayers.length > 0) {
      html += `<div class="queue-item waiting">Aguardando time: ${waitingPlayers.map(escapeHtml).join(', ')} (${waitingPlayers.length}/${playersPerTeam})</div>`;
    }
    html += '</div>';
    queueContainer.innerHTML = html;
  } else {
    queueContainer.innerHTML = '';
  }

  document.getElementById('resultSection').classList.add('hidden');
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
  document.getElementById('resultSection').classList.add('hidden');
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
      document.getElementById('resultSection').classList.remove('hidden');
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
    document.querySelector('.btn-draw').classList.add('selected');
  }

  setTimeout(() => processResult(result), 500);
}

function processResult(result) {
  if (result === 'draw') {
    const allPlayers = [...currentTeamA, ...currentTeamB].sort(() => Math.random() - 0.5);
    currentTeamA = allPlayers.slice(0, playersPerTeam);
    currentTeamB = allPlayers.slice(playersPerTeam, playersPerTeam * 2);

    renderMatchScreen();
    resetTimerState();
    saveState();
    return;
  }

  let winner, loser;
  if (result === 'A') {
    winner = currentTeamA;
    loser = currentTeamB;
  } else {
    winner = currentTeamB;
    loser = currentTeamA;
  }

  queue.push(loser);

  const nextTeam = queue.shift();
  currentTeamA = winner;
  currentTeamB = nextTeam;

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

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
});
