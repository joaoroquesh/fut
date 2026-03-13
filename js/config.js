// ===========================================
// config.js — Configurações editáveis
// ===========================================

// Setup screen config
function adjustNumber(id, delta) {
  const el = document.getElementById(id);
  const current = el.textContent === '∞' ? 0 : parseInt(el.textContent);
  let val = current + delta;
  if (id === 'playersPerTeam') {
    val = Math.max(1, Math.min(11, val));
    playersPerTeam = val;
  } else if (id === 'gameTime') {
    val = Math.max(1, Math.min(60, val));
    gameTimeMinutes = val;
  } else if (id === 'numCourts') {
    val = Math.max(1, Math.min(4, val));
    numCourts = val;
  } else if (id === 'goalsPerMatch') {
    val = Math.max(0, Math.min(20, val));
    goalsPerMatch = val;
  }
  el.textContent = (id === 'goalsPerMatch' && val === 0) ? '∞' : val;
  saveState();
  // Update team math display when playersPerTeam or numCourts changes
  if ((id === 'playersPerTeam' || id === 'numCourts') && typeof renderPlayerList === 'function') {
    renderPlayerList();
  }
  if (id === 'numCourts' && typeof renderTeamNameInputs === 'function') {
    renderTeamNameInputs();
  }
}

// Match screen config — temp values until "Salvar"
function toggleMatchConfig() {
  const section = document.getElementById('matchConfigSection');
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    // Initialize temp values from current
    tempPlayersPerTeam = playersPerTeam;
    tempGameTime = gameTimeMinutes;
    tempGoalsPerMatch = goalsPerMatch;
    document.getElementById('matchPlayersPerTeam').textContent = tempPlayersPerTeam;
    document.getElementById('matchGameTime').textContent = tempGameTime;
    document.getElementById('matchGoalsPerMatch').textContent = tempGoalsPerMatch === 0 ? '∞' : tempGoalsPerMatch;
  }
}

function adjustMatchConfig(id, delta) {
  if (id === 'matchPlayersPerTeam') {
    tempPlayersPerTeam = Math.max(1, Math.min(11, (tempPlayersPerTeam || playersPerTeam) + delta));
    document.getElementById('matchPlayersPerTeam').textContent = tempPlayersPerTeam;
  } else if (id === 'matchGameTime') {
    tempGameTime = Math.max(1, Math.min(60, (tempGameTime || gameTimeMinutes) + delta));
    document.getElementById('matchGameTime').textContent = tempGameTime;
  } else if (id === 'matchGoalsPerMatch') {
    const current = tempGoalsPerMatch != null ? tempGoalsPerMatch : goalsPerMatch;
    tempGoalsPerMatch = Math.max(0, Math.min(20, current + delta));
    document.getElementById('matchGoalsPerMatch').textContent = tempGoalsPerMatch === 0 ? '∞' : tempGoalsPerMatch;
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

  let goalsChanged = false;
  if (tempGoalsPerMatch !== null && tempGoalsPerMatch !== goalsPerMatch) {
    goalsPerMatch = tempGoalsPerMatch;
    document.getElementById('goalsPerMatch').textContent = goalsPerMatch === 0 ? '∞' : goalsPerMatch;
    goalsChanged = true;
  }

  // Close config panel
  document.getElementById('matchConfigSection').classList.add('hidden');

  if (teamChanged || timeChanged || goalsChanged) {
    renderMatchScreen();
    saveState();
  }
}

/**
 * Adapta os times de TODOS os courts ao novo tamanho.
 * Aumentar: pegar da fila e adicionar aos times
 * Diminuir: remover dos times e colocar no início da fila
 */
function adaptTeamsToNewSize(oldSize, newSize) {
  courts.forEach(court => {
    if (newSize > oldSize) {
      // Increase: add players from queue front to each team
      const needed = newSize - oldSize;
      for (let i = 0; i < needed; i++) {
        if (playerQueue.length > 0) {
          court.teamA.push(playerQueue.shift());
        }
        if (playerQueue.length > 0) {
          court.teamB.push(playerQueue.shift());
        }
      }
    } else if (newSize < oldSize) {
      // Decrease: remove from end of each team, prepend to queue
      const excess = oldSize - newSize;
      const removedFromA = court.teamA.splice(newSize, excess);
      const removedFromB = court.teamB.splice(newSize, excess);
      playerQueue = [...removedFromA, ...removedFromB, ...playerQueue];
    }
  });
}
