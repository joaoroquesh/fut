// ===========================================
// config.js — Configurações editáveis
// ===========================================

// Setup screen config
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

// Match screen config — temp values until "Salvar"
function toggleMatchConfig() {
  const section = document.getElementById('matchConfigSection');
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    // Initialize temp values from current
    tempPlayersPerTeam = playersPerTeam;
    tempGameTime = gameTimeMinutes;
    document.getElementById('matchPlayersPerTeam').textContent = tempPlayersPerTeam;
    document.getElementById('matchGameTime').textContent = tempGameTime;
  }
}

function adjustMatchConfig(id, delta) {
  if (id === 'matchPlayersPerTeam') {
    tempPlayersPerTeam = Math.max(1, Math.min(11, (tempPlayersPerTeam || playersPerTeam) + delta));
    document.getElementById('matchPlayersPerTeam').textContent = tempPlayersPerTeam;
  } else if (id === 'matchGameTime') {
    tempGameTime = Math.max(1, Math.min(60, (tempGameTime || gameTimeMinutes) + delta));
    document.getElementById('matchGameTime').textContent = tempGameTime;
  }
}

function applyMatchConfig() {
  const oldPPT = playersPerTeam;
  let teamChanged = false;
  let timeChanged = false;

  if (tempPlayersPerTeam !== null && tempPlayersPerTeam !== playersPerTeam) {
    playersPerTeam = tempPlayersPerTeam;
    document.getElementById('playersPerTeam').textContent = playersPerTeam;
    adaptTeamsToNewSize(oldPPT, playersPerTeam);
    rebalanceStars();
    teamChanged = true;
  }

  if (tempGameTime !== null && tempGameTime !== gameTimeMinutes) {
    gameTimeMinutes = tempGameTime;
    document.getElementById('gameTime').textContent = gameTimeMinutes;
    resetTimerState();
    timeChanged = true;
  }

  // Close config panel
  document.getElementById('matchConfigSection').classList.add('hidden');

  if (teamChanged || timeChanged) {
    renderMatchScreen();
    saveState();
  }
}

/**
 * Adapta os times atuais ao novo tamanho.
 * Lista ordenada: [teamA, teamB, fila]
 * Aumentar: pegar da fila e adicionar aos times
 * Diminuir: remover dos times e colocar no início da fila
 */
function adaptTeamsToNewSize(oldSize, newSize) {
  if (newSize > oldSize) {
    // Increase: add players from queue front to each team
    const needed = newSize - oldSize;
    for (let i = 0; i < needed; i++) {
      if (playerQueue.length > 0) {
        currentTeamA.push(playerQueue.shift());
      }
      if (playerQueue.length > 0) {
        currentTeamB.push(playerQueue.shift());
      }
    }
  } else if (newSize < oldSize) {
    // Decrease: remove from end of each team, prepend to queue
    const excess = oldSize - newSize;
    const removedFromA = currentTeamA.splice(newSize, excess);
    const removedFromB = currentTeamB.splice(newSize, excess);
    playerQueue = [...removedFromA, ...removedFromB, ...playerQueue];
  }
}
