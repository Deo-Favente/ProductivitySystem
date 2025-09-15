/*
    Nom : utils.js
    Description : Fonctions utilitaires pour la gestion des tickets
    Auteur : Deo-Favente
*/

// Convertit une valeur en id numérique valide (1..50) ou null
function toId(x) {
  const n = Number(x);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
}

// Collecte les ids utilisés dans "todo" et "doing"
function collectUsedIds(db) {
  const used = new Set();
  for (const col of ["todo", "doing"]) {
    for (const t of db[col] || []) {
      const n = toId(t.id);
      if (n !== null) used.add(n);
    }
  }
  return used;
}

// Trouve un id libre entre 1 et 50, ou null si plein
function nextFreeId(db) {
  db.meta = db.meta || { nextId: 1, lastStartedId: null };
  const used = collectUsedIds(db);

  for (let cand = 1; cand <= 50; cand++) {
    if (!used.has(cand)) {
      // on met à jour nextId (facultatif, juste indicatif)
      db.meta.nextId = cand + 1;
      if (db.meta.nextId > 50) db.meta.nextId = 1;
      return cand;
    }
  }
  return null; // plein, pas d'id libre
}

// S'assure que tous les tickets ont un id numérique unique entre 1 et 50
function migrateNumericIds(db) {
  db.todo = db.todo || [];
  db.doing = db.doing || [];
  db.done = db.done || [];
  db.meta = db.meta || { nextId: 1, lastStartedId: null };
  db.metrics = db.metrics || { amounts: [] };

  // Si tous les ids sont déjà valides et uniques dans 1..50, on se contente d'ajuster nextId
  const used = collectUsedIds(db);
  const total = (db.todo.length + db.doing.length + db.done.length);
  const allNumericValid = used.size === total && total <= 50;

  if (allNumericValid) {
    // Place nextId au premier libre après balayage
    for (let k = 0; k < 50; k++) {
      const candidate = ((db.meta.nextId ?? 1) - 1 + k) % 50 + 1;
      if (!used.has(candidate)) {
        db.meta.nextId = candidate;
        break;
      }
    }
    return;
  }

  // Sinon, on renumérote proprement 1..N (N <= 50) dans l'ordre: todo -> doing -> done
  const cols = ["todo", "doing", "done"];
  let n = 0;
  for (const col of cols) {
    for (const t of db[col]) {
      n++;
      if (n > 50) {
        throw new Error("Plus de 50 tickets: impossible de renuméroter sur 1..50");
      }
      t.id = n;
    }
  }
  db.meta.nextId = (n % 50) + 1;
}

// Trouve un ticket par son id numérique
function findTicket(db, idNum) {
  for (const col of ["todo", "doing", "done"]) {
    const idx = (db[col] || []).findIndex(t => t.id === idNum);
    if (idx >= 0) return { col, idx, ticket: db[col][idx] };
  }
  return null;
}

// Déplace un ticket d'une colonne à une autre
function moveTicket(db, idNum, to) {
  const found = findTicket(db, idNum);
  if (!found) return null;
  const { col, idx, ticket } = found;
  db[col].splice(idx, 1);
  db[to] ??= [];
  db[to].push(ticket);
  return { from: col, to, ticket };
}

// Calcule les métriques de croissance
function computeMetrics(metrics) {
  const arr = metrics?.amounts ?? [];
  const n = arr.length;
  const current = n ? Number(arr[n - 1].amount) : 0;
  const previous = n > 1 ? Number(arr[n - 2].amount) : 0;
  // Augmentation par rapport au total précédent (en pourcentage)
  const growthPercent = previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
  // Somme totale de tous les montants
  const sum = arr.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
  return { currentAmount: current, previousAmount: previous, growthPercent, totalAmount: sum };
}

export { toId, collectUsedIds, nextFreeId, migrateNumericIds, findTicket, moveTicket, computeMetrics };