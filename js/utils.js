// ===========================================
// utils.js — Funções utilitárias
// ===========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeJs(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(msg) {
  document.getElementById('setupError').textContent = msg;
}

function clearError() {
  document.getElementById('setupError').textContent = '';
}
