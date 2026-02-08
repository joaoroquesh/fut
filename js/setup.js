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

  // Update player count
  const countEl = document.getElementById('playerCount');
  if (countEl) {
    countEl.textContent = players.length > 0 ? `${players.length} jogador${players.length !== 1 ? 'es' : ''}` : '';
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
    .map(n => n.trim())
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
  const minPlayers = playersPerTeam * 2;
  if (players.length < minPlayers) {
    showError(`Precisa de pelo menos ${minPlayers} jogadores (${playersPerTeam} por time × 2 times)`);
    return;
  }

  // Use balanced distribution across ALL teams (including queue teams)
  const { teams, remaining } = balancedDistribute([...players], starPlayers, playersPerTeam);

  if (teams.length < 2) {
    showError('Não há jogadores suficientes para formar 2 times');
    return;
  }

  currentTeamA = teams[0];
  currentTeamB = teams[1];
  // Queue: remaining virtual teams flattened + leftover players
  playerQueue = [...teams.slice(2).flat(), ...remaining];

  teamNameA = 'Time A';
  teamNameB = 'Time B';
  draftStarted = true;
  matchHistory = [];

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
