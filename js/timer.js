// ===========================================
// timer.js — Timer, alerta sonoro e vibração
// ===========================================

function resetTimerState() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerSeconds = gameTimeMinutes * 60;
  updateTimerDisplay();
  document.getElementById('btnTimer').textContent = 'Iniciar';
  document.querySelector('.timer-display').classList.remove('finished');
  document.getElementById('timer').classList.remove('timer-running');
}

function toggleTimer() {
  if (timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (timerSeconds <= 0) return;
  timerRunning = true;
  removeTimerEndedGlow();
  document.getElementById('btnTimer').textContent = 'Pausar';
  document.getElementById('timer').classList.add('timer-running');

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      document.getElementById('btnTimer').textContent = 'Fim!';
      document.getElementById('timer').classList.remove('timer-running');
      document.querySelector('.timer-display').classList.add('finished');
      playTimerEndAlert();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('btnTimer').textContent = 'Continuar';
  document.getElementById('timer').classList.remove('timer-running');
}

function resetTimer() {
  removeTimerEndedGlow();
  resetTimerState();
  resetGoals();
}

function updateTimerDisplay() {
  const min = Math.floor(timerSeconds / 60);
  const sec = timerSeconds % 60;
  document.getElementById('timer').textContent =
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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

  // Visual glow
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
