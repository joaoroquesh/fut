// State
let players = [];
let playersPerTeam = 5;
let gameTimeMinutes = 10;
let teams = [];
let queue = [];
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
let swapSource = null; // { team: 'A'|'B', index: 0 } or { queue: qIdx, playerIdx: pIdx }

// Queue drag
let dragQueueIdx = null;

// --- Persistence ---

function saveState() {
  const state = {
    players,
    playersPerTeam,
    gameTimeMinutes,
    queue,
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
    queue = state.queue || [];
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
  teams = [];
  queue = [];
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

  teams = [];
  for (let i = 0; i < shuffled.length; i += playersPerTeam) {
    const teamPlayers = shuffled.slice(i, i + playersPerTeam);
    if (teamPlayers.length === playersPerTeam) {
      teams.push(teamPlayers);
    }
  }

  queue = teams.slice(2);
  currentTeamA = teams[0];
  currentTeamB = teams[1];
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
  if (queue.length > 0) {
    queueContainer.innerHTML = `
      <h3>Fila de espera</h3>
      <div class="queue-list">
        ${queue.map((t, i) => `<div class="queue-item">${i + 1}. ${t.map(escapeHtml).join(', ')}</div>`).join('')}
      </div>
    `;
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
    ...queue.flat()
  ];
  const waitingPlayers = getWaitingPlayers();
  if (allInGame.includes(name) || waitingPlayers.includes(name)) {
    return;
  }

  if (!players.includes(name)) {
    players.push(name);
  }

  waitingPlayers.push(name);
  setWaitingPlayers(waitingPlayers);

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

// --- Swap Players ---

function selectPlayerForSwap(team, index) {
  // If clicking same player, deselect
  if (swapSource && swapSource.team === team && swapSource.index === index) {
    swapSource = null;
    renderMatchScreen();
    return;
  }

  // If source is set and target is different location, do swap
  if (swapSource) {
    performSwap(team, index);
    return;
  }

  // Set source
  swapSource = { team, index };
  renderMatchScreen();
}

function selectQueuePlayerForSwap(queueIdx, playerIdx) {
  if (swapSource && swapSource.queueIdx === queueIdx && swapSource.playerIdx === playerIdx) {
    swapSource = null;
    renderMatchScreen();
    return;
  }

  if (swapSource) {
    performSwapWithQueue(queueIdx, playerIdx);
    return;
  }

  swapSource = { queueIdx, playerIdx };
  renderMatchScreen();
}

function performSwap(targetTeam, targetIndex) {
  const src = swapSource;

  if (src.team) {
    // Swap between two match players
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
    const temp = srcArr[src.index];
    srcArr[src.index] = tgtArr[targetIndex];
    tgtArr[targetIndex] = temp;
  } else if (src.queueIdx !== undefined) {
    // Swap queue player into match
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
    const temp = tgtArr[targetIndex];
    tgtArr[targetIndex] = queue[src.queueIdx][src.playerIdx];
    queue[src.queueIdx][src.playerIdx] = temp;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

function performSwapWithQueue(queueIdx, playerIdx) {
  const src = swapSource;

  if (src.team) {
    // Swap match player with queue player
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
    const temp = srcArr[src.index];
    srcArr[src.index] = queue[queueIdx][playerIdx];
    queue[queueIdx][playerIdx] = temp;
  } else if (src.queueIdx !== undefined) {
    // Swap two queue players
    const temp = queue[src.queueIdx][src.playerIdx];
    queue[src.queueIdx][src.playerIdx] = queue[queueIdx][playerIdx];
    queue[queueIdx][playerIdx] = temp;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

// --- Queue Reorder ---

function moveQueueTeam(fromIdx, direction) {
  const toIdx = fromIdx + direction;
  if (toIdx < 0 || toIdx >= queue.length) return;
  const temp = queue[fromIdx];
  queue[fromIdx] = queue[toIdx];
  queue[toIdx] = temp;
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

  // Queue + waiting
  const queueContainer = document.getElementById('matchQueue');
  const waitingPlayers = getWaitingPlayers();
  const hasQueue = queue.length > 0 || waitingPlayers.length > 0;

  if (hasQueue) {
    let html = '<h3>Fila de espera</h3><div class="queue-list">';
    queue.forEach((t, i) => {
      html += `<div class="queue-item-row">`;
      html += `<div class="queue-item-reorder">`;
      if (i > 0) {
        html += `<button class="queue-arrow" onclick="moveQueueTeam(${i}, -1)">▲</button>`;
      }
      if (i < queue.length - 1) {
        html += `<button class="queue-arrow" onclick="moveQueueTeam(${i}, 1)">▼</button>`;
      }
      html += `</div>`;
      html += `<div class="queue-item">${i + 1}. `;
      html += t.map((p, pi) => {
        const isSelected = swapSource && swapSource.queueIdx === i && swapSource.playerIdx === pi;
        const cls = isSelected ? 'player-swap selected' : 'player-swap';
        return `<span class="${cls}" onclick="selectQueuePlayerForSwap(${i}, ${pi})">${escapeHtml(p)}</span>`;
      }).join(', ');
      html += `</div></div>`;
    });
    if (waitingPlayers.length > 0) {
      html += `<div class="queue-item waiting">Aguardando time: ${waitingPlayers.map(escapeHtml).join(', ')} (${waitingPlayers.length}/${playersPerTeam})</div>`;
    }
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

  queue.push(loser);

  const nextTeam = queue.shift();
  currentTeamA = winner;
  currentTeamB = nextTeam;
  teamNameA = winnerName;
  teamNameB = 'Time ' + (Math.floor(Math.random() * 900) + 100);

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
