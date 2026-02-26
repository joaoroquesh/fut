// ===========================================
// stars.js — Lógica de estrelas e balanceamento
// ===========================================

function toggleStar(name) {
  if (starPlayers.includes(name)) {
    starPlayers = starPlayers.filter(p => p !== name);
  } else {
    starPlayers.push(name);
  }
  renderPlayerList();
  saveState();
}

/**
 * Distribui jogadores em times com estrelas balanceadas entre TODOS os times.
 * @param {string[]} allPlayers - Lista ordenada de todos os jogadores
 * @param {string[]} stars - Lista de nomes de jogadores estrela
 * @param {number} teamSize - Jogadores por time
 * @returns {{ teams: string[][], remaining: string[] }}
 */
function balancedDistribute(allPlayers, stars, teamSize) {
  const numTeams = Math.floor(allPlayers.length / teamSize);
  if (numTeams === 0) {
    return { teams: [], remaining: [...allPlayers] };
  }

  const starSet = new Set(stars);
  const starList = allPlayers.filter(p => starSet.has(p));
  const nonStarList = allPlayers.filter(p => !starSet.has(p));
  shuffleArray(starList);
  shuffleArray(nonStarList);

  // Create empty teams
  const teams = Array.from({ length: numTeams }, () => []);

  // Randomize which teams receive stars (so any team can end up without one)
  const teamOrder = Array.from({ length: numTeams }, (_, i) => i);
  shuffleArray(teamOrder);

  // Round-robin distribute stars using randomized team order
  starList.forEach((p, i) => {
    const teamIdx = teamOrder[i % numTeams];
    if (teams[teamIdx].length < teamSize) {
      teams[teamIdx].push(p);
    } else {
      // Team is full, find next with space following randomized order
      for (let j = 1; j <= numTeams; j++) {
        const idx = teamOrder[(i + j) % numTeams];
        if (teams[idx].length < teamSize) {
          teams[idx].push(p);
          break;
        }
      }
    }
  });

  // Fill remaining spots with non-stars
  let nonStarIdx = 0;
  for (let t = 0; t < numTeams; t++) {
    while (teams[t].length < teamSize && nonStarIdx < nonStarList.length) {
      teams[t].push(nonStarList[nonStarIdx++]);
    }
  }

  // Shuffle internal order of each team (stars don't always end up first)
  for (let t = 0; t < numTeams; t++) {
    shuffleArray(teams[t]);
  }

  // Remaining players (not enough for a full team)
  const placed = new Set(teams.flat());
  const remaining = [];
  // Remaining non-stars that weren't placed
  for (let i = nonStarIdx; i < nonStarList.length; i++) {
    remaining.push(nonStarList[i]);
  }
  // Any stars that couldn't fit (edge case: more stars than total team slots)
  starList.forEach(p => {
    if (!placed.has(p)) remaining.push(p);
  });

  return { teams, remaining };
}

/**
 * Forma um time balanceado a partir do início da fila, comparando com o time vencedor.
 * Se a diferença de estrelas for > 1, faz swap com alguém mais atrás na fila.
 * Modifica playerQueue in-place.
 * @param {string[]} winnerTeam - O time que ficou (vencedor)
 * @returns {string[]} O novo time formado da fila
 */
function formBalancedTeamFromQueue(winnerTeam) {
  if (playerQueue.length < playersPerTeam) {
    return playerQueue.splice(0, playerQueue.length);
  }

  const newTeam = playerQueue.splice(0, playersPerTeam);
  const starSet = new Set(starPlayers);
  const winnerStars = winnerTeam.filter(p => starSet.has(p)).length;
  const newTeamStars = newTeam.filter(p => starSet.has(p)).length;
  const diff = newTeamStars - winnerStars;

  // Try to balance if difference > 1
  if (diff > 1) {
    // newTeam has too many stars — swap a star out for a non-star from queue
    for (let attempt = 0; attempt < Math.ceil(Math.abs(diff) / 2); attempt++) {
      const starIdx = newTeam.findIndex(p => starSet.has(p));
      const nonStarQueueIdx = playerQueue.findIndex(p => !starSet.has(p));
      if (starIdx !== -1 && nonStarQueueIdx !== -1) {
        const temp = newTeam[starIdx];
        newTeam[starIdx] = playerQueue[nonStarQueueIdx];
        playerQueue[nonStarQueueIdx] = temp;
      } else break;
    }
  } else if (diff < -1) {
    // newTeam has too few stars — swap a non-star out for a star from queue
    for (let attempt = 0; attempt < Math.ceil(Math.abs(diff) / 2); attempt++) {
      const nonStarIdx = newTeam.findIndex(p => !starSet.has(p));
      const starQueueIdx = playerQueue.findIndex(p => starSet.has(p));
      if (nonStarIdx !== -1 && starQueueIdx !== -1) {
        const temp = newTeam[nonStarIdx];
        newTeam[nonStarIdx] = playerQueue[starQueueIdx];
        playerQueue[starQueueIdx] = temp;
      } else break;
    }
  }

  return newTeam;
}

/**
 * Rebalanceia estrelas entre teamA, teamB e fila após mudança de tamanho.
 * Reconstrói a lista completa e redistribui com balancedDistribute.
 */
function rebalanceStars() {
  const allPlayers = [...currentTeamA, ...currentTeamB, ...playerQueue];
  const { teams, remaining } = balancedDistribute(allPlayers, starPlayers, playersPerTeam);

  if (teams.length >= 2) {
    currentTeamA = teams[0];
    currentTeamB = teams[1];
    playerQueue = [...teams.slice(2).flat(), ...remaining];
  }
  // If less than 2 teams possible, keep current state
}
