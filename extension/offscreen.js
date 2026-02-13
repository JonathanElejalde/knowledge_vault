chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "offscreen:play-sound" || !message.file) {
    return;
  }

  const audio = new Audio(message.file);
  audio.volume = 0.8;
  audio.play().catch(() => {
    // Best-effort playback; swallow errors silently.
  });
});
