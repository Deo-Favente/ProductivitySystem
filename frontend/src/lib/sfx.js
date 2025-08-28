//import infoUrl from "../assets/info.mp3";

const aStart = new Audio("start.mp3");
const aComplete = new Audio("complete.mp3");
//const aInfo = new Audio(infoUrl);

// options
[aStart, aComplete].forEach(a => {
  a.preload = "auto";
  a.playsInline = true; // iOS
  a.volume = 0.8;       // ajuste à ton goût
});

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  // petit play/pause muet pour déverrouiller iOS/Chrome mobile
  [aStart, aComplete].forEach(a => {
    try { a.muted = true; a.play().then(()=>a.pause()).catch(()=>{}); a.currentTime = 0; } catch {}
  });
  audioUnlocked = true;
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
}
window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
window.addEventListener("keydown", unlockAudio,   { once: true });

let unlocked = false;
function unlockOnce() {
  if (unlocked) return;
  // Un petit play/pause pour “déverrouiller” l’audio mobile
  [aStart, aComplete].forEach(a => { try { a.muted = true; a.play().then(()=>a.pause()).catch(()=>{}); a.currentTime = 0; } catch(e) {} });
  unlocked = true;
  window.removeEventListener("pointerdown", unlockOnce);
  window.removeEventListener("keydown", unlockOnce);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockOnce, { once: true, passive: true });
  window.addEventListener("keydown", unlockOnce, { once: true });
}

function playSafe(base) {
  try {
    const el = base.cloneNode(true);      // nouveau <audio> à chaque fois
    el.volume = base.volume;
    el.play().catch(err => console.warn("Audio play blocked:", err?.name || err));
  } catch (e) {
    console.warn("Audio error:", e);
  }
}

export const sfx = {
  start()    { playSafe(aStart); },
  complete() { playSafe(aComplete); },
  //info()     { playSafe(aInfo); },
};


