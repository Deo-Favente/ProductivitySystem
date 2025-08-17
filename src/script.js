import * as Matter from 'matter-js';

// --- Sélection de la zone verte ---
const zoneVerte = document.getElementById("zone-verte");
const width = zoneVerte.clientWidth;
const height = zoneVerte.clientHeight;

// --- Création de l'engine et du renderer ---
const engine = Matter.Engine.create();
const world = engine.world;

// Pas de gravité horizontale
engine.world.gravity.x = 0;
engine.world.gravity.y = 1; // gravité verticale

// --- Renderer pour debug visuel (optionnel) ---
// const render = Matter.Render.create({
//   element: zoneVerte,
//   engine: engine,
//   options: {
//     width: width,
//     height: height,
//     wireframes: true, // true pour voir les formes brutes
//     background: 'transparent',
//   }
// });
// Matter.Render.run(render);

// --- Limites de la zone (bords) ---
const thickness = 50; // épaisseur invisible
const sol = Matter.Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true });
const plafond = Matter.Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true });
const murGauche = Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true });
const murDroit = Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true });

Matter.World.add(world, [sol, plafond, murGauche, murDroit]);

// --- Tableau pour garder la trace des papiers ---
const papiers = [];

// --- Fonction pour créer un papier ---
function creerPapier() {
    const papierDiv = document.createElement("div");
    papierDiv.className = "papier";
    zoneVerte.appendChild(papierDiv);

    const papierWidthVisuel = 80;
    const papierHeightVisuel = 60;

    // hitbox plus petite
    const papierWidthPhysique = 60;  // légèrement plus petit
    const papierHeightPhysique = 40;

    const body = Matter.Bodies.rectangle(
        Math.random() * (width - papierWidthVisuel) + papierWidthVisuel / 2,
        Math.random() * 100,
        papierWidthPhysique,
        papierHeightPhysique,
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

// --- Charger plusieurs papiers ---
function chargerPapiers(nb = 5) {
    for (let i = 0; i < nb; i++) creerPapier();
}

// --- Animation ---
function update() {
    Matter.Engine.update(engine, 1000 / 60);

    papiers.forEach(({ div, body }) => {
        div.style.left = `${body.position.x}px`;
        div.style.top = `${body.position.y}px`;
        div.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
    });

    requestAnimationFrame(update);
}

// --- Démarrage ---
window.addEventListener('load', () => {
    chargerPapiers(15); // nombre de papiers
    update();
});
