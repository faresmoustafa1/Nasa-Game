// Mission ARES — read a note out loud, with the browser's own voice (Settings → Read aloud).

export function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/km\/h/g, "kilometres per hour").replace(/°C/g, " degrees"));
    u.rate = 0.95;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    /* no voice available */
  }
}

export function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
}
