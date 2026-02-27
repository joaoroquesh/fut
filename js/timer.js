// ===========================================
// timer.js — Timer, alerta sonoro e vibração
// ===========================================

function resetTimerState() {
  const court = activeCourt();
  if (!court) return;
  if (court.timerInterval) {
    clearInterval(court.timerInterval);
    court.timerInterval = null;
  }
  court.timerRunning = false;
  court.timerSeconds = gameTimeMinutes * 60;
  updateTimerDisplay();
  document.getElementById('btnTimer').textContent = 'Iniciar';
  document.querySelector('.timer-display').classList.remove('finished');
  document.getElementById('timer').classList.remove('timer-running');
}

function toggleTimer() {
  const court = activeCourt();
  if (!court) return;
  if (court.timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  const court = activeCourt();
  if (!court || court.timerSeconds <= 0) return;
  court.timerRunning = true;
  removeTimerEndedGlow();
  document.getElementById('btnTimer').textContent = 'Pausar';
  document.getElementById('timer').classList.add('timer-running');

  const courtIndex = activeCourtIndex;
  court.timerInterval = setInterval(() => {
    court.timerSeconds--;
    // Only update DOM if this court is still the active one
    if (activeCourtIndex === courtIndex) {
      updateTimerDisplay();
    }
    if (court.timerSeconds <= 0) {
      clearInterval(court.timerInterval);
      court.timerInterval = null;
      court.timerRunning = false;
      // Always play alert regardless of active court
      playTimerEndAlert();
      if (activeCourtIndex === courtIndex) {
        document.getElementById('btnTimer').textContent = 'Fim!';
        document.getElementById('timer').classList.remove('timer-running');
        document.querySelector('.timer-display').classList.add('finished');
      }
      // Update court tabs to remove timer dot
      if (typeof renderCourtTabs === 'function') renderCourtTabs();
    }
  }, 1000);

  // Update court tabs to show timer dot
  if (typeof renderCourtTabs === 'function') renderCourtTabs();
}

function pauseTimer() {
  const court = activeCourt();
  if (!court) return;
  if (court.timerInterval) {
    clearInterval(court.timerInterval);
    court.timerInterval = null;
  }
  court.timerRunning = false;
  document.getElementById('btnTimer').textContent = 'Continuar';
  document.getElementById('timer').classList.remove('timer-running');
  if (typeof renderCourtTabs === 'function') renderCourtTabs();
}

function resetTimer() {
  removeTimerEndedGlow();
  resetTimerState();
  resetGoals();
}

function updateTimerDisplay() {
  const court = activeCourt();
  if (!court) return;
  const min = Math.floor(court.timerSeconds / 60);
  const sec = court.timerSeconds % 60;
  document.getElementById('timer').textContent =
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Syncs the timer DOM to reflect the active court's timer state.
 * Called when switching between courts.
 */
function syncTimerDisplay() {
  const court = activeCourt();
  if (!court) return;
  updateTimerDisplay();

  if (court.timerRunning) {
    document.getElementById('btnTimer').textContent = 'Pausar';
    document.getElementById('timer').classList.add('timer-running');
    document.querySelector('.timer-display').classList.remove('finished');
  } else if (court.timerSeconds <= 0) {
    document.getElementById('btnTimer').textContent = 'Fim!';
    document.getElementById('timer').classList.remove('timer-running');
    document.querySelector('.timer-display').classList.add('finished');
  } else {
    document.getElementById('btnTimer').textContent = 'Iniciar';
    document.getElementById('timer').classList.remove('timer-running');
    document.querySelector('.timer-display').classList.remove('finished');
  }
}

// --- Timer End Alert ---

function playTimerEndAlert() {
  // Sound: whistle-like using Web Audio API
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    playWhistle(ctx, 0);
    playWhistle(ctx, 0.4);
    playWhistle(ctx, 0.8);
  } catch (e) {
    // Fallback: silent if Web Audio not available
  }

  // Vibration
  if ('vibrate' in navigator) {
    navigator.vibrate([300, 100, 300, 100, 300]);
  }

  // Visual glow (always on match screen)
  document.getElementById('screen-match').classList.add('timer-ended-glow');
}

function playWhistle(ctx, delay) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(800, ctx.currentTime + delay);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + delay + 0.3);
  gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.35);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + 0.35);
}

function removeTimerEndedGlow() {
  document.getElementById('screen-match').classList.remove('timer-ended-glow');
}
