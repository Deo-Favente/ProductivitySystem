import express from "express";
import cors from "cors";
import { withDB } from "./storage.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ----------------- Utils IDs 1..50 ----------------- */

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

/* ----------------- Bootstrap ----------------- */
await withDB((db) => {
  migrateNumericIds(db);
  return { value: null };
});

/* ----------------- Routes Tickets ----------------- */

// GET /api/tickets
app.get("/api/tickets", async (_req, res) => {
  const data = await withDB((db) => ({ value: db, persist: false }));
  res.json({
    todo: data.todo ?? [],
    doing: data.doing ?? [],
    done:  data.done  ?? []
  });
});

// POST /api/tickets { title, subtitle, column? }
app.post("/api/tickets", async (req, res) => {
  const { title, subtitle, column = "todo" } = req.body || {};
  if (!title || !subtitle) return res.status(400).json({ error: "title et subtitle requis" });

  let created = null;
  await withDB((db) => {
    const id = nextFreeId(db);
    if (!id) return { value: null, persist: false }; // plein (50)
    const ticket = { id, title, subtitle };
    db[column] ??= [];
    db[column].push(ticket);
    created = ticket;
    return { value: ticket };
  });

  if (!created) return res.status(409).json({ error: "Capacité atteinte: 50 tickets" });
  res.status(201).json(created);
});

// DELETE /api/tickets/:id
app.delete("/api/tickets/:id", async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum < 1 || idNum > 50) {
    return res.status(400).json({ error: "id doit être un entier entre 1 et 50" });
  }
  let removed = null;
  await withDB((db) => {
    for (const col of ["todo", "doing", "done"]) {
      const idx = db[col]?.findIndex((t) => t.id === idNum);
      if (idx >= 0) { removed = db[col][idx]; db[col].splice(idx, 1); break; }
    }
    return { value: removed };
  });
  if (!removed) return res.status(404).json({ error: "Ticket introuvable" });
  res.json({ ok: true, removed });
});

// POST /api/tickets/:id/start  (À faire -> En cours) + mémorise le dernier id démarré
app.post("/api/tickets/:id/start", async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum)) return res.status(400).json({ error: "id invalide" });

  let result = null;
  await withDB((db) => {
    const found = findTicket(db, idNum);
    if (!found || found.col !== "todo") return { value: null, persist: false };
    result = moveTicket(db, idNum, "doing");
    db.meta ??= { nextId: 1, lastStartedId: null };
    db.meta.lastStartedId = idNum;
    return { value: result };
  });
  if (!result) return res.status(404).json({ error: "Ticket introuvable ou déjà en cours" });
  res.json({ ok: true, moved: result });
});

// POST /api/tickets/:id/complete  (En cours -> Terminé)
app.post("/api/tickets/:id/complete", async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum)) return res.status(400).json({ error: "id invalide" });

  let result = null;
  await withDB((db) => {
    const found = findTicket(db, idNum);
    if (!found || found.col !== "doing") return { value: null, persist: false };
    found.ticket.completedAt = new Date().toISOString();
    result = moveTicket(db, idNum, "done");
    return { value: result };
  });
  if (!result) return res.status(404).json({ error: "Ticket introuvable ou pas en cours" });
  res.json({ ok: true, moved: result });
});

/* ----------------- Meta & Metrics (inchangés sauf types) ----------------- */

app.get("/api/meta", async (_req, res) => {
  const meta = await withDB((db) => ({ value: db.meta ?? { nextId: 1, lastStartedId: null }, persist: false }));
  res.json({ lastStartedId: meta.lastStartedId ?? null });
});

// métriques simples (montant + croissance)
function computeMetrics(metrics) {
  const arr = metrics?.amounts ?? [];
  const n = arr.length;
  const current = n ? Number(arr[n - 1].amount) : 0;
  const previous = n > 1 ? Number(arr[n - 2].amount) : 0;
  const growthPercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { currentAmount: current, previousAmount: previous, growthPercent };
}

app.get("/api/metrics", async (_req, res) => {
  const data = await withDB((db) => ({ value: db.metrics ?? { amounts: [] }, persist: false }));
  res.json(computeMetrics(data));
});

app.post("/api/metrics/amount", async (req, res) => {
  const { amount } = req.body || {};
  const value = Number(amount);
  if (!Number.isFinite(value)) return res.status(400).json({ error: "amount doit être un nombre" });

  let out = null;
  await withDB((db) => {
    db.metrics ??= { amounts: [] };
    db.metrics.amounts.push({ date: new Date().toISOString(), amount: value });
    out = computeMetrics(db.metrics);
    return { value: out };
  });
  res.status(201).json(out);
});

/* ------------------------------------------------------- */
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API tickets → http://localhost:${PORT}`);
});
