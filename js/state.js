// ===========================================
// state.js — Estado global e persistência
// ===========================================

// State
let players = [];
let playersPerTeam = 6;
let gameTimeMinutes = 7;
let playerQueue = [];
let currentTeamA = null;
let currentTeamB = null;
let teamNameA = 'Time A';
let teamNameB = 'Time B';
let goalsA = 0;
let goalsB = 0;
let draftStarted = false;
let matchHistory = [];
let starPlayers = [];

// Timer
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

// Swap mode
let swapSource = null;

// Long-press
let longPressTimer = null;
let longPressTriggered = false;

// Match config temp state
let tempPlayersPerTeam = null;
let tempGameTime = null;

// Pending result (pre-computed for confirmation modal)
let pendingResult = null;

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
    matchHistory,
    starPlayers,
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
    playersPerTeam = state.playersPerTeam || 6;
    gameTimeMinutes = state.gameTimeMinutes || 7;
    playerQueue = state.playerQueue || [];
    currentTeamA = state.currentTeamA || null;
    currentTeamB = state.currentTeamB || null;
    teamNameA = state.teamNameA || 'Time A';
    teamNameB = state.teamNameB || 'Time B';
    draftStarted = state.draftStarted || false;
    matchHistory = state.matchHistory || [];
    starPlayers = state.starPlayers || [];

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
        showMatchTab('game');
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
  matchHistory = [];
  starPlayers = [];
  playersPerTeam = 6;
  gameTimeMinutes = 7;
  document.getElementById('playersPerTeam').textContent = '6';
  document.getElementById('gameTime').textContent = '7';
  renderPlayerList();
  clearError();
  showScreen('screen-setup');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
});
