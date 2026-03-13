// ===========================================
// state.js — Estado global e persistência
// ===========================================

// Global state (shared across courts)
let players = [];
let playersPerTeam = 6;
let gameTimeMinutes = 7;
let numCourts = 1;
let playerQueue = [];
let draftStarted = false;
let starPlayers = [];

// Courts (each court has its own match state)
let courts = [];
let activeCourtIndex = 0;

// Swap mode
let swapSource = null;

// Long-press
let longPressTimer = null;
let longPressTriggered = false;

// Match config temp state
let tempPlayersPerTeam = null;
let tempGameTime = null;
let tempGoalsPerMatch = null;

// Pending result (pre-computed for confirmation modal)
let pendingResult = null;

// Sprint 1: new configs
let goalsPerMatch = 0; // 0 = no limit
let courtNames = []; // [{nameA, nameB}] per court
let inactivePlayers = [];
let prioritizeArrival = false;
let arrivalMixFactor = 70; // 0-100 slider

// --- Court factory ---

function createCourt(index) {
  return {
    id: index,
    teamA: null,
    teamB: null,
    nameA: 'Time A',
    nameB: 'Time B',
    goalsA: 0,
    goalsB: 0,
    matchHistory: [],
    timerInterval: null,
    timerSeconds: gameTimeMinutes * 60,
    timerRunning: false
  };
}

function activeCourt() {
  return courts[activeCourtIndex];
}

// --- Persistence ---

function saveState() {
  const state = {
    version: 2,
    players,
    playersPerTeam,
    gameTimeMinutes,
    numCourts,
    playerQueue,
    draftStarted,
    starPlayers,
    activeCourtIndex,
    courts: courts.map(c => ({
      id: c.id,
      teamA: c.teamA,
      teamB: c.teamB,
      nameA: c.nameA,
      nameB: c.nameB,
      goalsA: c.goalsA,
      goalsB: c.goalsB,
      matchHistory: c.matchHistory,
      timerSeconds: c.timerSeconds,
      timerRunning: c.timerRunning
    })),
    currentScreen: document.querySelector('.screen.active')?.id || 'screen-setup',
    goalsPerMatch,
    courtNames,
    inactivePlayers,
    prioritizeArrival,
    arrivalMixFactor
  };
  localStorage.setItem('futDaGalera', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('futDaGalera');
  if (!raw) return false;

  try {
    const state = JSON.parse(raw);

    // Detect v1 (no version field) vs v2
    if (!state.version || state.version < 2) {
      return loadStateV1(state);
    }

    return loadStateV2(state);
  } catch (e) {
    return false;
  }
}

function loadStateV1(state) {
  // Migration from v1 (flat structure) to v2 (courts)
  players = state.players || [];
  playersPerTeam = state.playersPerTeam || 6;
  gameTimeMinutes = state.gameTimeMinutes || 7;
  numCourts = 1;
  playerQueue = state.playerQueue || [];
  draftStarted = state.draftStarted || false;
  starPlayers = state.starPlayers || [];
  activeCourtIndex = 0;

  // Create single court from v1 data
  courts = [];
  if (draftStarted && state.currentTeamA && state.currentTeamB) {
    const court = createCourt(0);
    court.teamA = state.currentTeamA;
    court.teamB = state.currentTeamB;
    court.nameA = state.teamNameA || 'Time A';
    court.nameB = state.teamNameB || 'Time B';
    court.matchHistory = state.matchHistory || [];
    courts = [court];
  }

  // Update UI
  document.getElementById('playersPerTeam').textContent = playersPerTeam;
  document.getElementById('gameTime').textContent = gameTimeMinutes;
  const numCourtsEl = document.getElementById('numCourts');
  if (numCourtsEl) numCourtsEl.textContent = numCourts;
  renderPlayerList();

  if (draftStarted && courts.length > 0) {
    renderTeamsScreen();
    const screen = state.currentScreen;
    if (screen === 'screen-match') {
      renderMatchScreen();
      resetTimerState();
      showScreen('screen-match');
      showMatchTab('game');
    } else {
      showScreen('screen-teams');
    }
  }

  // Save as v2 immediately to complete migration
  saveState();
  return true;
}

function loadStateV2(state) {
  players = state.players || [];
  playersPerTeam = state.playersPerTeam || 6;
  gameTimeMinutes = state.gameTimeMinutes || 7;
  numCourts = state.numCourts || 1;
  playerQueue = state.playerQueue || [];
  draftStarted = state.draftStarted || false;
  starPlayers = state.starPlayers || [];
  activeCourtIndex = state.activeCourtIndex || 0;
  goalsPerMatch = state.goalsPerMatch || 0;
  courtNames = state.courtNames || [];
  inactivePlayers = state.inactivePlayers || [];
  prioritizeArrival = state.prioritizeArrival || false;
  arrivalMixFactor = state.arrivalMixFactor != null ? state.arrivalMixFactor : 70;

  // Restore courts
  courts = (state.courts || []).map(c => {
    const court = createCourt(c.id);
    court.teamA = c.teamA;
    court.teamB = c.teamB;
    court.nameA = c.nameA || 'Time A';
    court.nameB = c.nameB || 'Time B';
    court.goalsA = c.goalsA || 0;
    court.goalsB = c.goalsB || 0;
    court.matchHistory = c.matchHistory || [];
    court.timerSeconds = c.timerSeconds != null ? c.timerSeconds : gameTimeMinutes * 60;
    court.timerRunning = false; // Never auto-start timers on load
    return court;
  });

  // Clamp activeCourtIndex
  if (activeCourtIndex >= courts.length) {
    activeCourtIndex = Math.max(0, courts.length - 1);
  }

  // Update UI
  document.getElementById('playersPerTeam').textContent = playersPerTeam;
  document.getElementById('gameTime').textContent = gameTimeMinutes;
  const numCourtsEl = document.getElementById('numCourts');
  if (numCourtsEl) numCourtsEl.textContent = numCourts;
  const gpmEl = document.getElementById('goalsPerMatch');
  if (gpmEl) gpmEl.textContent = goalsPerMatch === 0 ? '∞' : goalsPerMatch;
  const paEl = document.getElementById('prioritizeArrival');
  if (paEl) paEl.checked = prioritizeArrival;
  const mixSection = document.getElementById('mixSliderSection');
  if (mixSection) mixSection.classList.toggle('hidden', !prioritizeArrival);
  const mixSlider = document.getElementById('arrivalMixSlider');
  if (mixSlider) mixSlider.value = arrivalMixFactor;
  const mixLabel = document.getElementById('mixValueLabel');
  if (mixLabel) mixLabel.textContent = arrivalMixFactor + '%';
  if (typeof renderTeamNameInputs === 'function') renderTeamNameInputs();
  renderPlayerList();

  if (draftStarted && courts.length > 0) {
    renderTeamsScreen();
    const screen = state.currentScreen;
    if (screen === 'screen-match') {
      renderMatchScreen();
      resetTimerState();
      showScreen('screen-match');
      showMatchTab('game');
    } else {
      showScreen('screen-teams');
    }
  }
  return true;
}

function clearAll() {
  // Clear all court timers
  courts.forEach(c => {
    if (c.timerInterval) {
      clearInterval(c.timerInterval);
    }
  });

  localStorage.removeItem('futDaGalera');
  localStorage.removeItem('futWaiting');
  players = [];
  playerQueue = [];
  courts = [];
  activeCourtIndex = 0;
  numCourts = 1;
  draftStarted = false;
  starPlayers = [];
  playersPerTeam = 6;
  gameTimeMinutes = 7;
  goalsPerMatch = 0;
  courtNames = [];
  inactivePlayers = [];
  prioritizeArrival = false;
  arrivalMixFactor = 70;
  document.getElementById('playersPerTeam').textContent = '6';
  document.getElementById('gameTime').textContent = '7';
  const numCourtsEl = document.getElementById('numCourts');
  if (numCourtsEl) numCourtsEl.textContent = '1';
  const gpmEl = document.getElementById('goalsPerMatch');
  if (gpmEl) gpmEl.textContent = '∞';
  const paEl = document.getElementById('prioritizeArrival');
  if (paEl) paEl.checked = false;
  const mixSection = document.getElementById('mixSliderSection');
  if (mixSection) mixSection.classList.add('hidden');
  const mixSlider = document.getElementById('arrivalMixSlider');
  if (mixSlider) mixSlider.value = 70;
  const mixLabel = document.getElementById('mixValueLabel');
  if (mixLabel) mixLabel.textContent = '70%';
  renderPlayerList();
  clearError();
  showScreen('screen-setup');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
});
