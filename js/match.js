// ===========================================
// match.js — Tela de jogo, resultado e interações
// ===========================================

// --- Navigation ---

function startMatch() {
  courts.forEach(c => {
    c.goalsA = 0;
    c.goalsB = 0;
  });
  activeCourtIndex = 0;
  swapSource = null;
  removeTimerEndedGlow();
  renderMatchScreen();
  resetTimerState();
  showScreen('screen-match');
  showMatchTab('game');
  saveState();
}

function goBack() {
  // Stop ALL court timers
  courts.forEach(c => {
    if (c.timerInterval) {
      clearInterval(c.timerInterval);
      c.timerInterval = null;
    }
    c.timerRunning = false;
  });
  swapSource = null;
  removeTimerEndedGlow();
  showScreen('screen-teams');
  renderTeamsScreen();
  saveState();
}

function goBackToSetup() {
  draftStarted = false;
  saveState();
  showScreen('screen-setup');
}

// --- Court Switching ---

function switchCourt(index) {
  if (index < 0 || index >= courts.length) return;
  if (index === activeCourtIndex) return;
  activeCourtIndex = index;
  swapSource = null;
  pendingResult = null;
  removeTimerEndedGlow();
  renderMatchScreen();
  syncTimerDisplay();
  saveState();
}

function renderCourtTabs() {
  const tabsContainer = document.getElementById('courtTabs');
  if (!tabsContainer) return;

  if (courts.length <= 1) {
    tabsContainer.classList.add('hidden');
    return;
  }

  tabsContainer.classList.remove('hidden');
  let html = '';
  courts.forEach((court, i) => {
    const active = i === activeCourtIndex ? ' active' : '';
    let timerDot = '';
    if (court.timerRunning) {
      timerDot = '<span class="court-timer-dot">●</span>';
    } else if (court.timerSeconds <= 0) {
      timerDot = '<span class="court-timer-dot finished">●</span>';
    }
    html += `<button class="court-tab${active}" onclick="switchCourt(${i})">
      Quadra ${i + 1} ${timerDot}
    </button>`;
  });
  tabsContainer.innerHTML = html;
}

// --- Court Management ---

function addCourt() {
  if (playerQueue.length < playersPerTeam * 2) {
    alert(`Precisa de pelo menos ${playersPerTeam * 2} jogadores na fila para adicionar um jogo.`);
    return;
  }

  // Pull players from queue and form 2 balanced teams
  const pooled = playerQueue.splice(0, playersPerTeam * 2);
  const { teams, remaining } = balancedDistribute(pooled, starPlayers, playersPerTeam);

  if (teams.length >= 2) {
    const newCourt = createCourt(courts.length);
    newCourt.teamA = teams[0];
    newCourt.teamB = teams[1];
    newCourt.timerSeconds = gameTimeMinutes * 60;
    // Put any extra back in queue
    if (remaining.length > 0) {
      playerQueue.unshift(...remaining);
    }
    courts.push(newCourt);
    numCourts = courts.length;
    activeCourtIndex = courts.length - 1; // Switch to new court
    renderMatchScreen();
    syncTimerDisplay();
    saveState();
  } else {
    // Put players back
    playerQueue.unshift(...pooled);
    alert('Erro ao formar times. Jogadores devolvidos à fila.');
  }
}

function removeCourt() {
  if (courts.length <= 1) {
    alert('Precisa manter pelo menos 1 jogo.');
    return;
  }

  const court = activeCourt();
  if (!confirm(`Remover Quadra ${court.id + 1}? Os jogadores voltarão para a fila.`)) return;

  // Clear timer
  if (court.timerInterval) {
    clearInterval(court.timerInterval);
    court.timerInterval = null;
  }

  // Return players to queue
  const returned = [...(court.teamA || []), ...(court.teamB || [])];
  playerQueue.push(...returned);

  // Remove court
  courts.splice(activeCourtIndex, 1);
  numCourts = courts.length;

  // Renumber court IDs
  courts.forEach((c, i) => c.id = i);

  // Clamp activeCourtIndex
  if (activeCourtIndex >= courts.length) {
    activeCourtIndex = courts.length - 1;
  }

  renderMatchScreen();
  syncTimerDisplay();
  saveState();
}

// --- Match Tabs ---

function showMatchTab(tab) {
  const gameView = document.getElementById('matchGameView');
  const historyView = document.getElementById('matchHistoryView');
  const tabs = document.querySelectorAll('.match-tab');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'history') {
    gameView.classList.add('hidden');
    historyView.classList.remove('hidden');
    tabs[1].classList.add('active');
    renderHistory();
  } else {
    gameView.classList.remove('hidden');
    historyView.classList.add('hidden');
    tabs[0].classList.add('active');
  }
}

// --- Render Match Screen ---

function renderMatchScreen() {
  const court = activeCourt();
  if (!court) return;

  // Court tabs
  renderCourtTabs();

  // Court management buttons visibility
  const mgmt = document.getElementById('courtManagement');
  if (mgmt) {
    if (courts.length > 1 || playerQueue.length >= playersPerTeam * 2) {
      mgmt.classList.remove('hidden');
    } else {
      mgmt.classList.add('hidden');
    }
  }

  const container = document.getElementById('matchTeams');

  function playerHtml(name, team, index) {
    const isSelected = swapSource && swapSource.team === team && swapSource.index === index;
    const cls = isSelected ? 'player-swap selected' : 'player-swap';
    const isStar = starPlayers.includes(name);
    const display = (isStar ? '⭐ ' : '') + escapeHtml(name);
    return `<span class="${cls}"
      onclick="selectPlayerForSwap('${team}', ${index})"
      onmousedown="startLongPress('${team}', ${index}, event)"
      onmouseup="cancelLongPress()"
      onmouseleave="cancelLongPress()"
      ontouchstart="startLongPress('${team}', ${index}, event)"
      ontouchend="cancelLongPress()"
      ontouchcancel="cancelLongPress()"
    >${display}</span>`;
  }

  container.innerHTML = `
    <div class="match-team-card">
      <h3 class="editable" onclick="editTeamName('A')">${escapeHtml(court.nameA)} ✎</h3>
      <div class="players">
        ${court.teamA.map((p, i) => playerHtml(p, 'A', i)).join('')}
      </div>
    </div>
    <div class="vs-divider">VS</div>
    <div class="match-team-card">
      <h3 class="editable" onclick="editTeamName('B')">${escapeHtml(court.nameB)} ✎</h3>
      <div class="players">
        ${court.teamB.map((p, i) => playerHtml(p, 'B', i)).join('')}
      </div>
    </div>
  `;

  document.getElementById('scoreLabelA').textContent = court.nameA;
  document.getElementById('scoreLabelB').textContent = court.nameB;
  document.getElementById('goalsA').textContent = court.goalsA;
  document.getElementById('goalsB').textContent = court.goalsB;

  document.getElementById('btnTeamA').textContent = court.nameA + ' Venceu';
  document.getElementById('btnTeamB').textContent = court.nameB + ' Venceu';

  updateResultHighlight();

  // Match config sync
  const mpt = document.getElementById('matchPlayersPerTeam');
  const mgt = document.getElementById('matchGameTime');
  if (mpt) mpt.textContent = playersPerTeam;
  if (mgt) mgt.textContent = gameTimeMinutes;

  // Queue display (shared across all courts)
  renderQueueDisplay();

  // Inactive players section
  renderInactiveSection();

  // Sync match config goalsPerMatch display
  const mgpm = document.getElementById('matchGoalsPerMatch');
  if (mgpm) mgpm.textContent = goalsPerMatch === 0 ? '∞' : goalsPerMatch;
}

function renderQueueDisplay() {
  const queueContainer = document.getElementById('matchQueue');

  if (playerQueue.length > 0) {
    let html = '<h3>Fila de espera</h3><div class="queue-list">';

    playerQueue.forEach((p, i) => {
      // Visual divider between virtual teams in queue
      if (i > 0 && i % playersPerTeam === 0) {
        html += '<div class="queue-team-divider"></div>';
      }

      const isNext = i < playersPerTeam;
      const isSelected = swapSource && swapSource.queueIdx === i;
      let cls = 'queue-player-row';
      if (isNext) cls += ' queue-next';

      const playerCls = isSelected ? 'player-swap selected' : 'player-swap';
      const isStar = starPlayers.includes(p);
      const display = (isStar ? '⭐ ' : '') + escapeHtml(p);

      html += `<div class="${cls}">`;
      html += `<span class="queue-player-pos">${i + 1}.</span>`;
      html += `<span class="${playerCls}"
        onclick="selectQueuePlayerForSwap(${i})"
        onmousedown="startQueueLongPress(${i}, event)"
        onmouseup="cancelLongPress()"
        onmouseleave="cancelLongPress()"
        ontouchstart="startQueueLongPress(${i}, event)"
        ontouchend="cancelLongPress()"
        ontouchcancel="cancelLongPress()"
      >${display}</span>`;
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

// --- Team Name Editing ---

function editTeamName(team) {
  const court = activeCourt();
  if (!court) return;
  const current = team === 'A' ? court.nameA : court.nameB;
  const newName = prompt('Nome do time:', current);
  if (newName !== null && newName.trim() !== '') {
    if (team === 'A') {
      court.nameA = newName.trim();
    } else {
      court.nameB = newName.trim();
    }
    // Also update courtNames for persistence
    if (courtNames[activeCourtIndex]) {
      if (team === 'A') {
        courtNames[activeCourtIndex].nameA = newName.trim();
      } else {
        courtNames[activeCourtIndex].nameB = newName.trim();
      }
    }
    renderMatchScreen();
    saveState();
  }
}

// --- Goals ---

function adjustGoals(team, delta) {
  const court = activeCourt();
  if (!court) return;
  if (team === 'A') {
    court.goalsA = Math.max(0, court.goalsA + delta);
    document.getElementById('goalsA').textContent = court.goalsA;
  } else {
    court.goalsB = Math.max(0, court.goalsB + delta);
    document.getElementById('goalsB').textContent = court.goalsB;
  }
  updateResultHighlight();

  // Auto-detect goal limit reached
  if (goalsPerMatch > 0 && delta > 0) {
    if (court.goalsA >= goalsPerMatch || court.goalsB >= goalsPerMatch) {
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      const winner = court.goalsA >= goalsPerMatch ? 'A' : 'B';
      setTimeout(() => setResult(winner), 300);
    }
  }
}

function resetGoals() {
  const court = activeCourt();
  if (!court) return;
  court.goalsA = 0;
  court.goalsB = 0;
  document.getElementById('goalsA').textContent = '0';
  document.getElementById('goalsB').textContent = '0';
  updateResultHighlight();
}

function updateResultHighlight() {
  const court = activeCourt();
  if (!court) return;
  const btnA = document.getElementById('btnTeamA');
  const btnB = document.getElementById('btnTeamB');
  const btnD = document.getElementById('btnDraw');

  btnA.classList.remove('suggested');
  btnB.classList.remove('suggested');
  btnD.classList.remove('suggested');

  if (court.goalsA > court.goalsB) {
    btnA.classList.add('suggested');
  } else if (court.goalsB > court.goalsA) {
    btnB.classList.add('suggested');
  } else {
    btnD.classList.add('suggested');
  }
}

// --- Add Player to Queue (after draft) ---

function addPlayerToQueue() {
  const input = document.getElementById('queuePlayerName');
  const name = input.value.trim();
  if (!name) return;

  // Check ALL courts + queue + inactive for duplicates
  const allInGame = [];
  courts.forEach(c => {
    allInGame.push(...(c.teamA || []), ...(c.teamB || []));
  });
  allInGame.push(...playerQueue);
  allInGame.push(...inactivePlayers);

  if (allInGame.includes(name)) {
    // Visual feedback: flash red border
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 800);
    return;
  }

  if (!players.includes(name)) {
    players.push(name);
  }

  // Check if star checkbox is checked
  const starCheckbox = document.getElementById('queuePlayerStar');
  if (starCheckbox && starCheckbox.checked) {
    if (!starPlayers.includes(name)) {
      starPlayers.push(name);
    }
    starCheckbox.checked = false;
  }

  playerQueue.push(name);

  input.value = '';
  input.focus();
  renderMatchScreen();
  saveState();
}

// --- Swap Players ---

function selectPlayerForSwap(team, index) {
  if (longPressTriggered) return;

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
  if (longPressTriggered) return;

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
  const court = activeCourt();

  if (src.team) {
    const srcArr = src.team === 'A' ? court.teamA : court.teamB;
    const tgtArr = targetTeam === 'A' ? court.teamA : court.teamB;
    const playerA = srcArr[src.index];
    const playerB = tgtArr[targetIndex];
    if (!confirm(`Trocar ${playerA} com ${playerB}?`)) {
      swapSource = null;
      renderMatchScreen();
      return;
    }
    srcArr[src.index] = playerB;
    tgtArr[targetIndex] = playerA;
  } else if (src.queueIdx !== undefined) {
    const tgtArr = targetTeam === 'A' ? court.teamA : court.teamB;
    const playerA = playerQueue[src.queueIdx];
    const playerB = tgtArr[targetIndex];
    if (!confirm(`Trocar ${playerA} com ${playerB}?`)) {
      swapSource = null;
      renderMatchScreen();
      return;
    }
    tgtArr[targetIndex] = playerA;
    playerQueue[src.queueIdx] = playerB;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

function performSwapWithQueue(queueIdx) {
  const src = swapSource;
  const court = activeCourt();

  if (src.team) {
    const srcArr = src.team === 'A' ? court.teamA : court.teamB;
    const playerA = srcArr[src.index];
    const playerB = playerQueue[queueIdx];
    if (!confirm(`Trocar ${playerA} com ${playerB}?`)) {
      swapSource = null;
      renderMatchScreen();
      return;
    }
    srcArr[src.index] = playerB;
    playerQueue[queueIdx] = playerA;
  } else if (src.queueIdx !== undefined) {
    const playerA = playerQueue[src.queueIdx];
    const playerB = playerQueue[queueIdx];
    if (!confirm(`Trocar ${playerA} com ${playerB}?`)) {
      swapSource = null;
      renderMatchScreen();
      return;
    }
    playerQueue[src.queueIdx] = playerB;
    playerQueue[queueIdx] = playerA;
  }

  swapSource = null;
  renderMatchScreen();
  saveState();
}

// --- Long Press for Player Actions ---

function startLongPress(team, index, event) {
  longPressTriggered = false;
  // Only preventDefault on touch events to avoid blocking mouse interactions
  if (event.type === 'touchstart') {
    event.preventDefault();
  }
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    const court = activeCourt();
    const playerName = team === 'A' ? court.teamA[index] : court.teamB[index];
    showPlayerActionModal(playerName, team, index);
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function showPlayerActionModal(playerName, team, index) {
  const modal = document.getElementById('playerActionModal');
  const title = document.getElementById('playerActionTitle');
  const list = document.getElementById('playerActionList');
  const court = activeCourt();

  title.textContent = playerName;

  let html = '';

  // Expandable section: Banco (inactive)
  if (inactivePlayers.length > 0) {
    html += `<div class="modal-expand-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
      <span>😴 Banco (${inactivePlayers.length})</span><span>▶</span>
    </div>`;
    html += `<div class="modal-expand-list hidden">`;
    inactivePlayers.forEach((p, ii) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="substituteWithInactive('${team}', ${index}, ${ii})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)}
      </button>`;
    });
    html += `</div>`;
  }

  // Expandable section: Fila
  if (playerQueue.length > 0) {
    html += `<div class="modal-expand-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
      <span>⏳ Fila (${playerQueue.length})</span><span>▶</span>
    </div>`;
    html += `<div class="modal-expand-list hidden">`;
    playerQueue.forEach((p, qi) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="substitutePlayer('${team}', ${index}, ${qi})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)}
      </button>`;
    });
    html += `</div>`;
  }

  // Expandable section: Outro time
  const otherTeam = team === 'A' ? 'B' : 'A';
  const otherArr = otherTeam === 'A' ? court.teamA : court.teamB;
  const otherName = otherTeam === 'A' ? court.nameA : court.nameB;
  if (otherArr && otherArr.length > 0) {
    html += `<div class="modal-expand-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
      <span>🔄 ${escapeHtml(otherName)} (${otherArr.length})</span><span>▶</span>
    </div>`;
    html += `<div class="modal-expand-list hidden">`;
    otherArr.forEach((p, ti) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="swapTeamPlayers('${team}', ${index}, '${otherTeam}', ${ti})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)}
      </button>`;
    });
    html += `</div>`;
  }

  // Divider + bottom actions
  html += `<hr class="modal-divider">`;
  html += `<button class="action-option" onclick="renamePlayerAction('${team}', ${index})">✏️ Renomear</button>`;
  html += `<button class="action-option" onclick="deactivateTeamPlayer('${team}', ${index})">😴 Inativar</button>`;

  list.innerHTML = html;
  modal.classList.remove('hidden');
}

function closePlayerActionModal() {
  document.getElementById('playerActionModal').classList.add('hidden');
}

function renamePlayerAction(team, index) {
  closePlayerActionModal();
  const court = activeCourt();
  const arr = team === 'A' ? court.teamA : court.teamB;
  const oldName = arr[index];
  const newName = prompt('Novo nome do jogador:', oldName);
  if (newName !== null && newName.trim() !== '' && newName.trim() !== oldName) {
    const trimmed = newName.trim();
    arr[index] = trimmed;
    // Also update in players master list
    const pi = players.indexOf(oldName);
    if (pi !== -1) players[pi] = trimmed;
    // Update star status
    const si = starPlayers.indexOf(oldName);
    if (si !== -1) starPlayers[si] = trimmed;
    renderMatchScreen();
    saveState();
  }
}

function substitutePlayer(team, index, queueIdx) {
  closePlayerActionModal();
  const court = activeCourt();
  const arr = team === 'A' ? court.teamA : court.teamB;
  const playerOut = arr[index];
  const playerIn = playerQueue[queueIdx];
  if (!confirm(`Trocar ${playerOut} com ${playerIn}?`)) {
    swapSource = null;
    renderMatchScreen();
    return;
  }
  arr[index] = playerIn;
  playerQueue[queueIdx] = playerOut;
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

function moveQueuePlayerToTop(fromIdx) {
  if (fromIdx <= 0) return;
  const player = playerQueue.splice(fromIdx, 1)[0];
  playerQueue.unshift(player);
  renderMatchScreen();
  saveState();
}

function moveQueuePlayerToBottom(fromIdx) {
  if (fromIdx >= playerQueue.length - 1) return;
  const player = playerQueue.splice(fromIdx, 1)[0];
  playerQueue.push(player);
  renderMatchScreen();
  saveState();
}

// --- Inactive Players ---

function deactivateTeamPlayer(team, index) {
  closePlayerActionModal();
  const court = activeCourt();
  const arr = team === 'A' ? court.teamA : court.teamB;
  const player = arr[index];
  if (!confirm(`Inativar ${player}?`)) return;
  arr.splice(index, 1);
  inactivePlayers.push(player);
  if (playerQueue.length > 0) {
    arr.push(playerQueue.shift());
  }
  renderMatchScreen();
  saveState();
}

function deactivateQueuePlayer(queueIdx) {
  closePlayerActionModal();
  const player = playerQueue[queueIdx];
  if (!confirm(`Inativar ${player}?`)) return;
  playerQueue.splice(queueIdx, 1);
  inactivePlayers.push(player);
  renderMatchScreen();
  saveState();
}

function reactivatePlayer(inactiveIdx) {
  const player = inactivePlayers[inactiveIdx];
  inactivePlayers.splice(inactiveIdx, 1);
  playerQueue.push(player);
  renderMatchScreen();
  saveState();
}

function toggleInactiveList() {
  const list = document.getElementById('inactiveList');
  if (list) list.classList.toggle('hidden');
}

function renderInactiveSection() {
  const section = document.getElementById('inactiveSection');
  if (!section) return;
  if (inactivePlayers.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  let html = `<button class="btn-link" onclick="toggleInactiveList()">😴 Banco (${inactivePlayers.length})</button>`;
  html += '<div id="inactiveList" class="inactive-list">';
  inactivePlayers.forEach((p, i) => {
    const isStar = starPlayers.includes(p);
    html += `<div class="inactive-player-row">
      <span>${isStar ? '⭐ ' : ''}${escapeHtml(p)}</span>
      <button class="btn-reactivate" onclick="reactivatePlayer(${i})">↩</button>
    </div>`;
  });
  html += '</div>';
  section.innerHTML = html;
}

function substituteWithInactive(team, teamIndex, inactiveIdx) {
  closePlayerActionModal();
  const court = activeCourt();
  const arr = team === 'A' ? court.teamA : court.teamB;
  const playerOut = arr[teamIndex];
  const playerIn = inactivePlayers[inactiveIdx];
  if (!confirm(`${playerIn} entra, ${playerOut} vai para a fila?`)) return;
  arr[teamIndex] = playerIn;
  inactivePlayers.splice(inactiveIdx, 1);
  playerQueue.push(playerOut);
  renderMatchScreen();
  saveState();
}

function swapTeamPlayers(fromTeam, fromIndex, toTeam, toIndex) {
  closePlayerActionModal();
  const court = activeCourt();
  const fromArr = fromTeam === 'A' ? court.teamA : court.teamB;
  const toArr = toTeam === 'A' ? court.teamA : court.teamB;
  const pA = fromArr[fromIndex];
  const pB = toArr[toIndex];
  if (!confirm(`Trocar ${pA} com ${pB}?`)) return;
  fromArr[fromIndex] = pB;
  toArr[toIndex] = pA;
  renderMatchScreen();
  saveState();
}

// --- Queue Long Press ---

function startQueueLongPress(queueIdx, event) {
  longPressTriggered = false;
  if (event.type === 'touchstart') {
    event.preventDefault();
  }
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    const playerName = playerQueue[queueIdx];
    showQueuePlayerActionModal(playerName, queueIdx);
  }, 500);
}

function showQueuePlayerActionModal(playerName, queueIdx) {
  const modal = document.getElementById('playerActionModal');
  const title = document.getElementById('playerActionTitle');
  const list = document.getElementById('playerActionList');

  title.textContent = playerName;

  let html = '';

  // Reorder buttons
  html += `<p class="action-subtitle">Posição na fila</p>`;
  html += `<div class="action-move-row">
    <button class="action-move-btn" onclick="closePlayerActionModal(); moveQueuePlayer(${queueIdx}, -1)">⬆ Subir</button>
    <button class="action-move-btn" onclick="closePlayerActionModal(); moveQueuePlayer(${queueIdx}, 1)">⬇ Descer</button>
  </div>`;
  html += `<div class="action-move-row" style="margin-top:4px">
    <button class="action-move-btn" onclick="closePlayerActionModal(); moveQueuePlayerToTop(${queueIdx})">⏫ Topo</button>
    <button class="action-move-btn" onclick="closePlayerActionModal(); moveQueuePlayerToBottom(${queueIdx})">⏬ Fim</button>
  </div>`;

  // Divider + bottom actions
  html += `<hr class="modal-divider">`;
  html += `<button class="action-option" onclick="renameQueuePlayerAction(${queueIdx})">✏️ Renomear</button>`;
  html += `<button class="action-option" onclick="deactivateQueuePlayer(${queueIdx})">😴 Inativar</button>`;

  list.innerHTML = html;
  modal.classList.remove('hidden');
}

function renameQueuePlayerAction(queueIdx) {
  closePlayerActionModal();
  const oldName = playerQueue[queueIdx];
  const newName = prompt('Novo nome do jogador:', oldName);
  if (newName !== null && newName.trim() !== '' && newName.trim() !== oldName) {
    const trimmed = newName.trim();
    playerQueue[queueIdx] = trimmed;
    const pi = players.indexOf(oldName);
    if (pi !== -1) players[pi] = trimmed;
    const si = starPlayers.indexOf(oldName);
    if (si !== -1) starPlayers[si] = trimmed;
    renderMatchScreen();
    saveState();
  }
}

function substituteQueueWithTeam(queueIdx, team, teamIndex) {
  closePlayerActionModal();
  const court = activeCourt();
  const arr = team === 'A' ? court.teamA : court.teamB;
  const playerOut = arr[teamIndex];
  const playerIn = playerQueue[queueIdx];
  if (!confirm(`Trocar ${playerIn} com ${playerOut}?`)) {
    swapSource = null;
    renderMatchScreen();
    return;
  }
  arr[teamIndex] = playerIn;
  playerQueue[queueIdx] = playerOut;
  swapSource = null;
  renderMatchScreen();
  saveState();
}

// --- Result with Pre-computed State ---

function setResult(result) {
  showResultConfirmationModal(result);
}

/**
 * Pre-computes the next state (teams, queue, names) for a given result.
 * Operates on the active court with shared global queue.
 */
function computeNextState(result) {
  const court = activeCourt();
  const state = {
    result: result,
    courtIndex: activeCourtIndex,
    goalsA: court.goalsA,
    goalsB: court.goalsB,
    prevTeamA: court.nameA,
    prevTeamB: court.nameB,
    prevPlayersA: [...court.teamA],
    prevPlayersB: [...court.teamB]
  };

  if (result === 'draw') {
    // Both teams out — shuffle among themselves and send to END of queue
    const matchPlayers = [...court.teamA, ...court.teamB];
    shuffleArray(matchPlayers);

    // Preserve FIFO: existing queue first, then the players who just played
    const tempQueue = [...playerQueue, ...matchPlayers];

    // Pull next 2 teams from the FRONT of the queue
    state.nextTeamA = tempQueue.splice(0, playersPerTeam);
    state.nextTeamB = tempQueue.splice(0, playersPerTeam);

    // Light star balancing — avoid 2+ stars on one team when other has 0
    const starSet = new Set(starPlayers);
    const starsA = state.nextTeamA.filter(p => starSet.has(p)).length;
    const starsB = state.nextTeamB.filter(p => starSet.has(p)).length;
    const diff = starsA - starsB;

    if (diff > 1) {
      // Team A has too many stars — swap star out for non-star from queue
      for (let att = 0; att < Math.ceil(diff / 2); att++) {
        const si = state.nextTeamA.findIndex(p => starSet.has(p));
        const ni = tempQueue.findIndex(p => !starSet.has(p));
        if (si !== -1 && ni !== -1) {
          const t = state.nextTeamA[si];
          state.nextTeamA[si] = tempQueue[ni];
          tempQueue[ni] = t;
        } else break;
      }
    } else if (diff < -1) {
      // Team B has too many stars — swap star out for non-star from queue
      for (let att = 0; att < Math.ceil(Math.abs(diff) / 2); att++) {
        const si = state.nextTeamB.findIndex(p => starSet.has(p));
        const ni = tempQueue.findIndex(p => !starSet.has(p));
        if (si !== -1 && ni !== -1) {
          const t = state.nextTeamB[si];
          state.nextTeamB[si] = tempQueue[ni];
          tempQueue[ni] = t;
        } else break;
      }
    }

    state.nextQueue = tempQueue;
    state.nextNameA = court.nameA;
    state.nextNameB = court.nameB;
  } else {
    const winner = result === 'A' ? [...court.teamA] : [...court.teamB];
    const loser = result === 'A' ? [...court.teamB] : [...court.teamA];
    const winnerName = result === 'A' ? court.nameA : court.nameB;

    // Loser goes to end of queue
    const tempQueue = [...playerQueue, ...loser];

    if (tempQueue.length >= playersPerTeam) {
      // Form balanced team from queue vs winner
      const newTeam = tempQueue.splice(0, playersPerTeam);
      const starSet = new Set(starPlayers);
      const winnerStars = winner.filter(p => starSet.has(p)).length;
      const newTeamStars = newTeam.filter(p => starSet.has(p)).length;
      const diff = newTeamStars - winnerStars;

      if (diff > 1) {
        for (let attempt = 0; attempt < Math.ceil(Math.abs(diff) / 2); attempt++) {
          const starIdx = newTeam.findIndex(p => starSet.has(p));
          const nonStarQueueIdx = tempQueue.findIndex(p => !starSet.has(p));
          if (starIdx !== -1 && nonStarQueueIdx !== -1) {
            const t = newTeam[starIdx];
            newTeam[starIdx] = tempQueue[nonStarQueueIdx];
            tempQueue[nonStarQueueIdx] = t;
          } else break;
        }
      } else if (diff < -1) {
        for (let attempt = 0; attempt < Math.ceil(Math.abs(diff) / 2); attempt++) {
          const nonStarIdx = newTeam.findIndex(p => !starSet.has(p));
          const starQueueIdx = tempQueue.findIndex(p => starSet.has(p));
          if (nonStarIdx !== -1 && starQueueIdx !== -1) {
            const t = newTeam[nonStarIdx];
            newTeam[nonStarIdx] = tempQueue[starQueueIdx];
            tempQueue[starQueueIdx] = t;
          } else break;
        }
      }

      state.nextTeamA = winner;
      state.nextTeamB = newTeam;
      state.nextQueue = tempQueue;
      state.nextNameA = winnerName;
      state.nextNameB = result === 'A' ? court.nameB : court.nameA;
    } else {
      // Not enough for a full team
      const backPlayers = tempQueue.splice(0, tempQueue.length);
      state.nextTeamA = winner;
      state.nextTeamB = backPlayers.length === playersPerTeam ? backPlayers : loser;
      state.nextQueue = state.nextTeamB === loser ? [] : tempQueue;
      state.nextNameA = winnerName;
      state.nextNameB = result === 'A' ? court.nameB : court.nameA;
    }
  }

  return state;
}

function showResultConfirmationModal(result) {
  const court = activeCourt();
  if (!court) return;

  // Pre-compute the next state ONCE
  pendingResult = computeNextState(result);

  const modal = document.getElementById('resultConfirmModal');
  const body = document.getElementById('resultConfirmBody');

  let resultText;
  if (result === 'draw') {
    resultText = 'Empate';
  } else {
    resultText = (result === 'A' ? court.nameA : court.nameB) + ' Venceu';
  }

  // Court label for multi-court
  const courtLabel = courts.length > 1 ? `<div class="confirm-court-label">Quadra ${activeCourtIndex + 1}</div>` : '';

  // Show star indicators in confirmation — vertical layout
  function playerListHtml(players) {
    return players.map(p => {
      const isStar = starPlayers.includes(p);
      return `<div class="confirm-player-item">${isStar ? '⭐ ' : ''}${escapeHtml(p)}</div>`;
    }).join('');
  }

  body.innerHTML = `
    ${courtLabel}
    <div class="confirm-result-text">${escapeHtml(resultText)}</div>
    <div class="confirm-score">${escapeHtml(court.nameA)} ${court.goalsA} × ${court.goalsB} ${escapeHtml(court.nameB)}</div>
    <div class="confirm-divider"></div>
    <p class="confirm-next-title">Próximo jogo:</p>
    <div class="confirm-teams">
      <div class="confirm-team">
        <strong>${escapeHtml(pendingResult.nextNameA)}</strong>
        <div class="confirm-players">${playerListHtml(pendingResult.nextTeamA)}</div>
      </div>
      <span class="confirm-vs">VS</span>
      <div class="confirm-team">
        <strong>${escapeHtml(pendingResult.nextNameB)}</strong>
        <div class="confirm-players">${playerListHtml(pendingResult.nextTeamB)}</div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function confirmResult() {
  const modal = document.getElementById('resultConfirmModal');
  modal.classList.add('hidden');

  if (!pendingResult) return;
  applyPendingResult();
}

function applyPendingResult() {
  if (!pendingResult) return;

  // Get the court this result was computed for
  const courtIndex = pendingResult.courtIndex;
  const court = courts[courtIndex];
  if (!court) return;

  // Record match in history (per-court)
  court.matchHistory.push({
    teamA: pendingResult.prevTeamA,
    teamB: pendingResult.prevTeamB,
    goalsA: pendingResult.goalsA,
    goalsB: pendingResult.goalsB,
    result: pendingResult.result,
    playersA: pendingResult.prevPlayersA,
    playersB: pendingResult.prevPlayersB
  });

  // Apply pre-computed state to the court
  court.teamA = pendingResult.nextTeamA;
  court.teamB = pendingResult.nextTeamB;
  playerQueue = pendingResult.nextQueue;
  court.nameA = pendingResult.nextNameA;
  court.nameB = pendingResult.nextNameB;

  pendingResult = null;

  resetGoals();
  swapSource = null;
  removeTimerEndedGlow();
  renderMatchScreen();
  resetTimerState();
  saveState();
}

function cancelResult() {
  document.getElementById('resultConfirmModal').classList.add('hidden');
  document.querySelectorAll('.result-buttons button').forEach(b => b.classList.remove('selected'));
  pendingResult = null;
}

// --- History ---

function renderHistory() {
  const container = document.getElementById('matchHistoryView');

  if (courts.length <= 1) {
    // Single court — show its history directly
    const court = activeCourt();
    if (!court || court.matchHistory.length === 0) {
      container.innerHTML = '<p class="history-empty">Nenhum jogo registrado ainda.</p>';
      return;
    }
    container.innerHTML = renderHistoryCards(court.matchHistory);
  } else {
    // Multi-court — show tabs for each court + combined
    let html = '<div class="history-court-tabs">';
    html += `<button class="history-court-tab active" onclick="filterHistory(-1)">Todos</button>`;
    courts.forEach((c, i) => {
      html += `<button class="history-court-tab" onclick="filterHistory(${i})">Quadra ${i + 1}</button>`;
    });
    html += '</div>';
    html += '<div id="historyContent">';

    // Combined history (all courts)
    const allHistory = [];
    courts.forEach((c, ci) => {
      c.matchHistory.forEach((m, mi) => {
        allHistory.push({ ...m, courtIndex: ci, matchIndex: mi });
      });
    });

    if (allHistory.length === 0) {
      html += '<p class="history-empty">Nenhum jogo registrado ainda.</p>';
    } else {
      html += renderHistoryCards(allHistory, true);
    }

    html += '</div>';
    container.innerHTML = html;
  }
}

function filterHistory(courtIndex) {
  // Update active tab
  document.querySelectorAll('.history-court-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === courtIndex + 1);
  });

  const content = document.getElementById('historyContent');
  if (courtIndex === -1) {
    // All courts
    const allHistory = [];
    courts.forEach((c, ci) => {
      c.matchHistory.forEach(m => {
        allHistory.push({ ...m, courtIndex: ci });
      });
    });
    content.innerHTML = allHistory.length > 0
      ? renderHistoryCards(allHistory, true)
      : '<p class="history-empty">Nenhum jogo registrado ainda.</p>';
  } else {
    const court = courts[courtIndex];
    content.innerHTML = court && court.matchHistory.length > 0
      ? renderHistoryCards(court.matchHistory)
      : '<p class="history-empty">Nenhum jogo registrado ainda.</p>';
  }
}

function renderHistoryCards(history, showCourtLabel) {
  let html = '';
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const num = i + 1;

    let badgeText, badgeCls;
    if (m.result === 'draw') {
      badgeText = 'Empate';
      badgeCls = 'history-badge draw';
    } else if (m.result === 'A') {
      badgeText = escapeHtml(m.teamA) + ' venceu';
      badgeCls = 'history-badge win';
    } else {
      badgeText = escapeHtml(m.teamB) + ' venceu';
      badgeCls = 'history-badge win';
    }

    const courtInfo = showCourtLabel && m.courtIndex !== undefined
      ? `<span class="history-court-label">Q${m.courtIndex + 1}</span>` : '';

    html += `
      <div class="history-card">
        <div class="history-header">
          <span class="history-num">${courtInfo}Jogo ${num}</span>
          <span class="${badgeCls}">${badgeText}</span>
        </div>
        <div class="history-score">
          <span class="history-team-name">${escapeHtml(m.teamA)}</span>
          <span class="history-goals">${m.goalsA}</span>
          <span class="history-x">×</span>
          <span class="history-goals">${m.goalsB}</span>
          <span class="history-team-name">${escapeHtml(m.teamB)}</span>
        </div>
        <div class="history-players">
          <span>${m.playersA.map(escapeHtml).join(', ')}</span>
          <span class="history-vs">vs</span>
          <span>${m.playersB.map(escapeHtml).join(', ')}</span>
        </div>
      </div>
    `;
  }
  return html;
}
