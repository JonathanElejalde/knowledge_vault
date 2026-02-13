// ---------------------------------------------------------------------------
// Synthesized fallback tones via Web Audio API
// ---------------------------------------------------------------------------

function playTone(frequency, startTime, duration, ctx, destination) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.45, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  oscillator.connect(gain);
  gain.connect(destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playFallbackTone() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  playTone(523, now, 0.22, ctx, ctx.destination);
  playTone(659, now + 0.18, 0.32, ctx, ctx.destination);
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "offscreen:play-sound" || !message.url) {
    return;
  }

  const audio = new Audio(message.url);
  audio.volume = 0.8;
  audio.play().catch(() => {
    // Frontend sound file unavailable — fall back to synthesized tone.
    playFallbackTone();
  });
});
