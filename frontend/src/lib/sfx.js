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
