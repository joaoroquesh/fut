// ===========================================
// match.js — Tela de jogo, resultado e interações
// ===========================================

// --- Navigation ---

function startMatch() {
  goalsA = 0;
  goalsB = 0;
  swapSource = null;
  removeTimerEndedGlow();
  renderMatchScreen();
  resetTimerState();
  showScreen('screen-match');
  showMatchTab('game');
  saveState();
}

function goBack() {
  clearInterval(timerInterval);
  timerRunning = false;
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

  document.getElementById('scoreLabelA').textContent = teamNameA;
  document.getElementById('scoreLabelB').textContent = teamNameB;
  document.getElementById('goalsA').textContent = goalsA;
  document.getElementById('goalsB').textContent = goalsB;

  document.getElementById('btnTeamA').textContent = teamNameA + ' Venceu';
  document.getElementById('btnTeamB').textContent = teamNameB + ' Venceu';

  updateResultHighlight();

  // Match config sync
  const mpt = document.getElementById('matchPlayersPerTeam');
  const mgt = document.getElementById('matchGameTime');
  if (mpt) mpt.textContent = playersPerTeam;
  if (mgt) mgt.textContent = gameTimeMinutes;

  // Queue display
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

// --- Add Player to Queue (after draft) ---

function addPlayerToQueue() {
  const input = document.getElementById('queuePlayerName');
  const name = input.value.trim();
  if (!name) return;

  const allInGame = [
    ...(currentTeamA || []),
    ...(currentTeamB || []),
    ...playerQueue
  ];
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

  if (src.team) {
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
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
    const tgtArr = targetTeam === 'A' ? currentTeamA : currentTeamB;
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

  if (src.team) {
    const srcArr = src.team === 'A' ? currentTeamA : currentTeamB;
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
    const playerName = team === 'A' ? currentTeamA[index] : currentTeamB[index];
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

  title.textContent = playerName;

  let html = '';
  html += `<button class="action-option" onclick="renamePlayerAction('${team}', ${index})">✏️ Renomear</button>`;

  if (playerQueue.length > 0) {
    html += `<div class="action-divider"></div>`;
    html += `<p class="action-subtitle">Substituir por:</p>`;
    playerQueue.forEach((p, qi) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="substitutePlayer('${team}', ${index}, ${qi})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)}
      </button>`;
    });
  }

  list.innerHTML = html;
  modal.classList.remove('hidden');
}

function closePlayerActionModal() {
  document.getElementById('playerActionModal').classList.add('hidden');
}

function renamePlayerAction(team, index) {
  closePlayerActionModal();
  const arr = team === 'A' ? currentTeamA : currentTeamB;
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
  const arr = team === 'A' ? currentTeamA : currentTeamB;
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
  html += `<button class="action-option" onclick="renameQueuePlayerAction(${queueIdx})">✏️ Renomear</button>`;

  // Offer swap with team players
  if (currentTeamA.length > 0 || currentTeamB.length > 0) {
    html += `<div class="action-divider"></div>`;
    html += `<p class="action-subtitle">Trocar com jogador do time:</p>`;
    currentTeamA.forEach((p, ti) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="substituteQueueWithTeam(${queueIdx}, 'A', ${ti})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)} <span style="color:var(--gray);font-size:0.75rem">(${escapeHtml(teamNameA)})</span>
      </button>`;
    });
    currentTeamB.forEach((p, ti) => {
      const isStar = starPlayers.includes(p);
      html += `<button class="action-option action-substitute" onclick="substituteQueueWithTeam(${queueIdx}, 'B', ${ti})">
        ${isStar ? '⭐ ' : ''}${escapeHtml(p)} <span style="color:var(--gray);font-size:0.75rem">(${escapeHtml(teamNameB)})</span>
      </button>`;
    });
  }

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
  const arr = team === 'A' ? currentTeamA : currentTeamB;
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
 * This ensures what the modal shows is exactly what will be applied.
 */
function computeNextState(result) {
  const state = {
    result: result,
    goalsA: goalsA,
    goalsB: goalsB,
    prevTeamA: teamNameA,
    prevTeamB: teamNameB,
    prevPlayersA: [...currentTeamA],
    prevPlayersB: [...currentTeamB]
  };

  if (result === 'draw') {
    // Both teams out — shuffle among themselves and send to END of queue
    const matchPlayers = [...currentTeamA, ...currentTeamB];
    shuffleArray(matchPlayers);

    // Preserve FIFO: existing queue first, then the players who just played
    const tempQueue = [...playerQueue, ...matchPlayers];

    // Pull next 2 teams from the FRONT of the queue
    state.nextTeamA = tempQueue.splice(0, playersPerTeam);
    state.nextTeamB = tempQueue.splice(0, playersPerTeam);
    state.nextQueue = tempQueue;

    state.nextNameA = 'Novo Time';
    state.nextNameB = 'Novo Time';
  } else {
    const winner = result === 'A' ? [...currentTeamA] : [...currentTeamB];
    const loser = result === 'A' ? [...currentTeamB] : [...currentTeamA];
    const winnerName = result === 'A' ? teamNameA : teamNameB;

    // Loser goes to end of queue
    const tempQueue = [...playerQueue, ...loser];

    if (tempQueue.length >= playersPerTeam) {
      // Form balanced team from queue vs winner
      // Simulate formBalancedTeamFromQueue
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
      state.nextNameB = 'Novo Time';
    } else {
      // Not enough for a full team
      const backPlayers = tempQueue.splice(0, tempQueue.length);
      state.nextTeamA = winner;
      state.nextTeamB = backPlayers.length === playersPerTeam ? backPlayers : loser;
      state.nextQueue = state.nextTeamB === loser ? [] : tempQueue;
      state.nextNameA = winnerName;
      state.nextNameB = 'Novo Time';
    }
  }

  return state;
}

function showResultConfirmationModal(result) {
  // Pre-compute the next state ONCE
  pendingResult = computeNextState(result);

  const modal = document.getElementById('resultConfirmModal');
  const body = document.getElementById('resultConfirmBody');

  let resultText;
  if (result === 'draw') {
    resultText = 'Empate';
  } else {
    resultText = (result === 'A' ? teamNameA : teamNameB) + ' Venceu';
  }

  // Show star indicators in confirmation — vertical layout
  function playerListHtml(players) {
    return players.map(p => {
      const isStar = starPlayers.includes(p);
      return `<div class="confirm-player-item">${isStar ? '⭐ ' : ''}${escapeHtml(p)}</div>`;
    }).join('');
  }

  body.innerHTML = `
    <div class="confirm-result-text">${escapeHtml(resultText)}</div>
    <div class="confirm-score">${escapeHtml(teamNameA)} ${goalsA} × ${goalsB} ${escapeHtml(teamNameB)}</div>
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

  const result = pendingResult.result;

  // Visual feedback on button
  document.querySelectorAll('.result-buttons button').forEach(b => b.classList.remove('selected'));
  if (result === 'A') {
    document.getElementById('btnTeamA').classList.add('selected');
  } else if (result === 'B') {
    document.getElementById('btnTeamB').classList.add('selected');
  } else {
    document.getElementById('btnDraw').classList.add('selected');
  }

  setTimeout(() => applyPendingResult(), 400);
}

function applyPendingResult() {
  if (!pendingResult) return;

  // Record match in history
  matchHistory.push({
    teamA: pendingResult.prevTeamA,
    teamB: pendingResult.prevTeamB,
    goalsA: pendingResult.goalsA,
    goalsB: pendingResult.goalsB,
    result: pendingResult.result,
    playersA: pendingResult.prevPlayersA,
    playersB: pendingResult.prevPlayersB
  });

  // Apply pre-computed state
  currentTeamA = pendingResult.nextTeamA;
  currentTeamB = pendingResult.nextTeamB;
  playerQueue = pendingResult.nextQueue;
  teamNameA = pendingResult.nextNameA;
  teamNameB = pendingResult.nextNameB;

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
  pendingResult = null;
}

// --- History ---

function renderHistory() {
  const container = document.getElementById('matchHistoryView');

  if (matchHistory.length === 0) {
    container.innerHTML = '<p class="history-empty">Nenhum jogo registrado ainda.</p>';
    return;
  }

  let html = '';
  for (let i = matchHistory.length - 1; i >= 0; i--) {
    const m = matchHistory[i];
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

    html += `
      <div class="history-card">
        <div class="history-header">
          <span class="history-num">Jogo ${num}</span>
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

  container.innerHTML = html;
}
