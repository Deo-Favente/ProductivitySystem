function toId(x) {
  const n = Number(x);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
}

// 👉 On EXCLUT 'done' pour libérer l'ID dès qu'un ticket est terminé
function collectUsedIds(db) {
  const used = new Set();
  for (const col of ["todo", "doing"]) {   // <— seulement ces colonnes
    for (const t of db[col] || []) {
      const n = toId(t.id);
      if (n !== null) used.add(n);
    }
  }
  return used;
}

/** Renvoie le plus petit ID libre (1..50), en ignorant 'done' */
function nextFreeId(db) {
  db.meta ??= { nextId: 1, lastStartedId: null };
  const used = collectUsedIds(db);

  for (let cand = 1; cand <= 50; cand++) {
    if (!used.has(cand)) {
      // on met à jour nextId (facultatif, juste indicatif)
      db.meta.nextId = cand + 1;
      if (db.meta.nextId > 50) db.meta.nextId = 1;
      return cand;
    }
  }
  return null; // plein: 50 tickets effectivement actifs (todo+doing)
}



/** Migration: s'assurer que tous les tickets ont un id numérique unique 1..50 et initialiser nextId */
function migrateNumericIds(db) {
  db.todo ??= [];
  db.doing ??= [];
  db.done ??= [];
  db.meta ??= { nextId: 1, lastStartedId: null };
  db.metrics ??= { amounts: [] };

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

/** Trouver un ticket par id numérique */
function findTicket(db, idNum) {
  for (const col of ["todo", "doing", "done"]) {
    const idx = (db[col] || []).findIndex(t => t.id === idNum);
    if (idx >= 0) return { col, idx, ticket: db[col][idx] };
  }
  return null;
}

/** Déplacer un ticket vers une autre colonne */
function moveTicket(db, idNum, to) {
  const found = findTicket(db, idNum);
  if (!found) return null;
  const { col, idx, ticket } = found;
  db[col].splice(idx, 1);
  db[to] ??= [];
  db[to].push(ticket);
  return { from: col, to, ticket };
}

function computeMetrics(metrics) {
  const arr = metrics?.amounts ?? [];
  const n = arr.length;
  const current = n ? Number(arr[n - 1].amount) : 0;
  const previous = n > 1 ? Number(arr[n - 2].amount) : 0;
  const growthPercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { currentAmount: current, previousAmount: previous, growthPercent };
}

export { toId, collectUsedIds, nextFreeId, migrateNumericIds, findTicket, moveTicket, computeMetrics };