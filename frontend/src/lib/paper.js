let zoneEl = null;
const papiers = [];
let animationFrame = null;
let taillePapier = 100;
const GRAVITY = 0.8;
const DAMPING = 0.3;

export function setPaperZone(el) {
  zoneEl = el;
  if (!zoneEl) return;
  if (getComputedStyle(zoneEl).position === "static") {
    zoneEl.style.position = "relative";
  }
}

function getZoneSize() {
  const rect = zoneEl.getBoundingClientRect();
  return {
    width: rect.width || 265,
    height: rect.height || 770,
  };
}

function setSizeForCount(n) {
    const { width, height } = getZoneSize();
    const maxHeight = height * 0.5;
    // Faire en sorte que la zone width * maxHeight soit remplie de n carrés
    const areaPerPaper = (width * maxHeight) / n;
    taillePapier = Math.floor(Math.sqrt(areaPerPaper));
  document.documentElement.style.setProperty("--taille", `${taillePapier}px`);
}

function createPaper() {
  const { width, height } = getZoneSize();
  const maxHeight = height * 0.5;
  const maxPerColumn = Math.max(1, Math.floor(maxHeight / taillePapier));

  // Combien de colonnes max tiennent dans la zone ?
  const maxCols = Math.max(1, Math.floor((width) / (taillePapier)));

  // colonne choisie en fonction de l’index
  const colIndex = Math.floor(papiers.length / maxPerColumn);
  const usedCol = colIndex % maxCols; // on boucle si trop de colonnes

  // position X bien alignée dans la largeur
  const x = usedCol * taillePapier / 2;
  const y = -taillePapier;

  const div = document.createElement("div");
  div.className = "papier";
  div.style.position = "absolute";
  div.style.width = `${taillePapier}px`;
  div.style.height = `${taillePapier}px`;
  div.style.left = `${x}px`;
  div.style.top = `0px`;

  zoneEl.appendChild(div);

  papiers.push({
    div,
    x,
    y,
    vy: 0,
    col: usedCol,
  });
}


function animate() {
  const { height } = getZoneSize();
  const maxHeight = height;

  for (let i = 0; i < papiers.length; i++) {
    const p = papiers[i];

    // appliquer gravité
    p.vy += GRAVITY;
    p.y += p.vy;

    // collision avec "sol virtuel" = moitié de la zone
    if (p.y + taillePapier > maxHeight) {
      p.y = maxHeight - taillePapier;
      p.vy *= -DAMPING;
      if (Math.abs(p.vy) < 0.5) p.vy = 0;
    }

    // collision avec papiers de la même colonne
    for (let j = 0; j < i; j++) {
      const other = papiers[j];
      if (other.col === p.col) {
        if (p.y < other.y + taillePapier && p.y + taillePapier > other.y) {
          p.y = other.y - taillePapier;
          p.vy = 0;
        }
      }
    }

    // appliquer au DOM
    p.div.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }

  animationFrame = requestAnimationFrame(animate);
}

export function chargerPapier(n) {
  if (!zoneEl) throw new Error("[paper] setPaperZone doit être appelé avant");

  n = 1000;
  setSizeForCount(n);

  while (papiers.length < n) createPaper();
  while (papiers.length > n) {
    const last = papiers.pop();
    last.div.remove();
  }

  if (!animationFrame) animate();
}

export function reset_papiers() {
  cancelAnimationFrame(animationFrame);
  animationFrame = null;
  while (papiers.length) {
    const p = papiers.pop();
    p.div.remove();
  }
}
