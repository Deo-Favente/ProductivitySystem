import startUrl from "../assets/sounds/start.mp3";
import completeUrl from "../assets/sounds/complete.mp3";
//import infoUrl from "../assets/sounds/info.mp3";

const aStart = new Audio(startUrl);
const aComplete = new Audio(completeUrl);
//const aInfo = new Audio(infoUrl);

// options
[aStart, aComplete, aInfo].forEach(a => {
  a.preload = "auto";
  a.playsInline = true; // iOS
  a.volume = 0.8;       // ajuste à ton goût
});

let unlocked = false;
function unlockOnce() {
  if (unlocked) return;
  // Un petit play/pause pour “déverrouiller” l’audio mobile
  [aStart, aComplete, aInfo].forEach(a => { try { a.muted = true; a.play().then(()=>a.pause()).catch(()=>{}); a.currentTime = 0; } catch(e) {} });
  unlocked = true;
  window.removeEventListener("pointerdown", unlockOnce);
  window.removeEventListener("keydown", unlockOnce);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockOnce, { once: true, passive: true });
  window.addEventListener("keydown", unlockOnce, { once: true });
}

export const sfx = {
  start()    { try { aStart.currentTime = 0; aStart.play(); } catch(e) {} },
  complete() { try { aComplete.currentTime = 0; aComplete.play(); } catch(e) {} },
  //info()     { try { aInfo.currentTime = 0; aInfo.play(); } catch(e) {} },
};
