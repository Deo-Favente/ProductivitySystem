// src/paper.js
import * as Matter from "matter-js";

let zoneEl = null;
let engine = null;
let world = null;
let walls = [];
const papiers = [];

/* ---------- util ---------- */
function getZoneSize() {
  if (!zoneEl) return { width: 600, height: 300 };
  const rect = zoneEl.getBoundingClientRect();
  // fallback si l'élément est "hidden" (width/height = 0)
  const width = Math.max( rect.width  || 0, 600 );
  const height = Math.max( rect.height || 0, 300 );
  return { width, height };
}

function setSizeForCount(n) {
  // plus il y a de papiers, plus ils sont petits
  const taille = 200 / Math.cbrt(Math.max(1, n));
  document.documentElement.style.setProperty("--taille", `${taille}px`);
}

/* ---------- init paresseux ---------- */
function initIfNeeded() {
  if (engine) return; // déjà prêt

  zoneEl = document.getElementById("zone-verte");
  if (!zoneEl) {
    throw new Error(
      "[paper] #zone-verte introuvable. Assure-toi que Vue a rendu le template avant d'appeler char_papier(n)."
    );
  }

  const { width, height } = getZoneSize();

  engine = Matter.Engine.create();
  world = engine.world;
  world.gravity.x = 0;
  world.gravity.y = 1;

  const thickness = 50;
  const ground  = Matter.Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true });
  const ceiling = Matter.Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true });
  const left    = Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true });
  const right   = Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true });

  walls = [ground, ceiling, left, right];
  Matter.World.add(world, walls);

  // boucle d'animation
  const update = () => {
    Matter.Engine.update(engine, 1000 / 60);
    for (const { div, body } of papiers) {
      div.style.left = `${body.position.x}px`;
      div.style.top = `${body.position.y}px`;
      div.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
    }
    requestAnimationFrame(update);
  };
  update();

  // (optionnel) ajuste les murs si la zone est redimensionnée
  const ro = new ResizeObserver(() => {
    const { width: w, height: h } = getZoneSize();
    // retire anciens murs puis recrée
    Matter.World.remove(world, walls);
    const ground2  = Matter.Bodies.rectangle(w / 2, h + thickness / 2, w, thickness, { isStatic: true });
    const ceiling2 = Matter.Bodies.rectangle(w / 2, -thickness / 2, w, thickness, { isStatic: true });
    const left2    = Matter.Bodies.rectangle(-thickness / 2, h / 2, thickness, h, { isStatic: true });
    const right2   = Matter.Bodies.rectangle(w + thickness / 2, h / 2, thickness, h, { isStatic: true });
    walls = [ground2, ceiling2, left2, right2];
    Matter.World.add(world, walls);
  });
  ro.observe(zoneEl);
}

/* ---------- création / gestion papier ---------- */
function createPaper() {
  const taille = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--taille")
  ) || 100;

  // hitbox plus petite
  const hit = taille * 0.8;

  const { width, height } = getZoneSize();

  const papierDiv = document.createElement("div");
  papierDiv.className = "papier";
  zoneEl.appendChild(papierDiv);

  const body = Matter.Bodies.rectangle(
    Math.random() * (width - taille) + taille / 2,
    Math.random() * 100,
    hit,
    hit,
    {
      restitution: 0.05,
      friction: 0.3,
      frictionAir: 0.05,
      angle: Math.random() * Math.PI / 8 - Math.PI / 16
    }
  );

  Matter.World.add(world, body);
  papiers.push({ div: papierDiv, body });
}

/* ---------- API publique ---------- */
// Ajuste le nombre de papiers visibles au nombre n (ajoute/retire le delta)
export function chargerPapiers(n) {
  initIfNeeded();

  setSizeForCount(n);

  const cur = papiers.length;
  if (n > cur) {
    for (let i = 0; i < n - cur; i++) createPaper();
  } else if (n < cur) {
    for (let i = 0; i < cur - n; i++) {
      const last = papiers.pop();
      if (last) {
        Matter.World.remove(world, last.body);
        last.div.remove();
      }
    }
  }
}

// Optionnel: reset complet
export function reset_papiers() {
  if (!engine) return;
  while (papiers.length) {
    const p = papiers.pop();
    Matter.World.remove(world, p.body);
    p.div.remove();
  }
}
