function getCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
}

function playTone(ctx, freq, type, startAt, dur, vol = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.05);
}

export function playDaySound() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Ascending chime: C5, E5, G5, C6 — twice for emphasis
  [523, 659, 784, 1047].forEach((f, i) => playTone(ctx, f, 'sine', t + i * 0.15, 1.0, 0.5));
  [523, 659, 784, 1047].forEach((f, i) => playTone(ctx, f, 'sine', t + 0.75 + i * 0.15, 0.8, 0.35));
}

export function playNightSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Descending dark tone: A3, E3, A2 — louder and longer
  [220, 165, 110].forEach((f, i) => playTone(ctx, f, 'sine', t + i * 0.28, 1.8, 0.45));
  // Low rumble overlay
  playTone(ctx, 80, 'triangle', t, 2.5, 0.25);
  // Eerie high whisper
  playTone(ctx, 440, 'sine', t + 0.15, 1.5, 0.18);
}
