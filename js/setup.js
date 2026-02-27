// ===========================================
// setup.js — Tela de configuração e sorteio
// ===========================================

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
  starPlayers = starPlayers.filter(p => p !== name);
  renderPlayerList();
  saveState();
}

function renderPlayerList() {
  const container = document.getElementById('playerList');
  container.innerHTML = players.map(p => {
    const isStar = starPlayers.includes(p);
    const cls = isStar ? 'player-tag player-star' : 'player-tag';
    return `<div class="${cls}" onclick="toggleStar('${escapeJs(p)}')">
      <span>${isStar ? '⭐ ' : ''}${escapeHtml(p)}</span>
      <span class="remove" onclick="event.stopPropagation(); removePlayer('${escapeJs(p)}')">&times;</span>
    </div>`;
  }).join('');

  // Update player count with team math
  const countEl = document.getElementById('playerCount');
  if (countEl) {
    if (players.length > 0) {
      const numTeams = Math.floor(players.length / playersPerTeam);
      const sobra = players.length % playersPerTeam;
      let text = `${players.length} jogador${players.length !== 1 ? 'es' : ''}`;

      const minTeams = numCourts * 2;
      if (numTeams >= minTeams) {
        if (numCourts > 1) {
          text += ` · ${numCourts} quadras`;
        } else {
          text += ` · ${numTeams} times`;
        }
        const queuePlayers = (numTeams - minTeams) * playersPerTeam + sobra;
        if (queuePlayers > 0) text += ` + ${queuePlayers} na fila`;
      } else if (numTeams >= 2) {
        if (numCourts > 1) {
          const possibleCourts = Math.floor(numTeams / 2);
          text += ` · ${possibleCourts}/${numCourts} quadras`;
        } else {
          text += ` · ${numTeams} times`;
          if (sobra > 0) text += ` + ${sobra} na fila`;
        }
      }

      const starCount = starPlayers.filter(s => players.includes(s)).length;
      if (starCount > 0) {
        text += ` · ⭐ ${starCount}`;
      }
      countEl.textContent = text;
    } else {
      countEl.textContent = '';
    }
  }
}

// --- Bulk Import ---

function toggleBulkImport() {
  const section = document.getElementById('bulkImportSection');
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    document.getElementById('bulkImportText').focus();
  }
}

function processBulkImport() {
  const textarea = document.getElementById('bulkImportText');
  const text = textarea.value;
  if (!text.trim()) return;

  const names = text.split('\n')
    .map(n => {
      let cleaned = n.trim();
      cleaned = cleaned.replace(/^\d+[\.\)\-\s]\s*/, '');     // "1.", "2)", "3-"
      cleaned = cleaned.replace(/^[\-\u2013\u2014]+\s*/, '');  // leading hyphens/dashes
      cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');          // text in parentheses
      cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '');  // emojis + skin tones + flags
      return cleaned.trim();
    })
    .filter(n => n.length > 0);

  let added = 0;
  names.forEach(name => {
    if (!players.includes(name)) {
      players.push(name);
      added++;
    }
  });

  textarea.value = '';
  document.getElementById('bulkImportSection').classList.add('hidden');
  renderPlayerList();
  clearError();
  if (added > 0) {
    saveState();
  }
}

// --- Draft ---

function startDraft() {
  const minPlayers = playersPerTeam * numCourts * 2;
  if (players.length < minPlayers) {
    if (numCourts > 1) {
      showError(`Precisa de pelo menos ${minPlayers} jogadores (${playersPerTeam} × ${numCourts * 2} times)`);
    } else {
      showError(`Precisa de pelo menos ${minPlayers} jogadores (${playersPerTeam} por time × 2 times)`);
    }
    return;
  }

  // Use balanced distribution across ALL teams (including queue teams)
  const { teams, remaining } = balancedDistribute([...players], starPlayers, playersPerTeam);

  if (teams.length < numCourts * 2) {
    showError(`Não há jogadores suficientes para formar ${numCourts} jogo${numCourts > 1 ? 's' : ''}`);
    return;
  }

  // Create courts
  courts = [];
  for (let i = 0; i < numCourts; i++) {
    const court = createCourt(i);
    court.teamA = teams[i * 2];
    court.teamB = teams[i * 2 + 1];
    courts.push(court);
  }

  // Queue: remaining virtual teams flattened + leftover players
  playerQueue = [...teams.slice(numCourts * 2).flat(), ...remaining];

  activeCourtIndex = 0;
  draftStarted = true;

  renderTeamsScreen();
  showScreen('screen-teams');
  saveState();
}

function renderTeamsScreen() {
  const container = document.getElementById('teamsDisplay');
  let html = '';

  courts.forEach((court, i) => {
    if (courts.length > 1) {
      html += `<div class="court-heading">Quadra ${i + 1}</div>`;
    }
    html += renderTeamCard(court.nameA, court.teamA);
    html += renderTeamCard(court.nameB, court.teamB);
  });

  container.innerHTML = html;

  const queueContainer = document.getElementById('queueDisplay');
  if (playerQueue.length > 0) {
    let qhtml = '<h3>Fila de espera</h3><div class="queue-list">';
    playerQueue.forEach((p, i) => {
      const isNext = i < playersPerTeam;
      const isStar = starPlayers.includes(p);
      const cls = isNext ? 'queue-player-item queue-next' : 'queue-player-item';
      qhtml += `<div class="${cls}">${i + 1}. ${isStar ? '⭐ ' : ''}${escapeHtml(p)}</div>`;
    });
    qhtml += '</div>';
    queueContainer.innerHTML = qhtml;
  } else {
    queueContainer.innerHTML = '';
  }
}

function renderTeamCard(title, teamPlayers) {
  return `
    <div class="team-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="players">
        ${teamPlayers.map(p => {
          const isStar = starPlayers.includes(p);
          return `<span>${isStar ? '⭐ ' : ''}${escapeHtml(p)}</span>`;
        }).join('')}
      </div>
    </div>
  `;
}
