import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { withDB } from "./storage.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Helpers numérotation 1..50 ---------- */

function gatherUsedNumbers(db) {
  const used = new Set();
  for (const col of ["todo", "doing", "done"]) {
    for (const t of db[col] || []) {
      if (typeof t.no === "number") used.add(t.no);
    }
  }
  return used;
}

function nextFreeNumber(db) {
  const used = gatherUsedNumbers(db);
  for (let n = 1; n <= 50; n++) {
    if (!used.has(n)) return n;
  }
  return null; // plus de place
}

/** Migration douce: si un ticket n'a pas de 'no', on lui attribue le prochain libre */
function migrateAddNumbers(db) {
  let changed = false;
  for (const col of ["todo", "doing", "done"]) {
    for (const t of db[col] || []) {
      if (typeof t.no !== "number") {
        const n = nextFreeNumber(db);
        if (!n) continue;
        t.no = n;
        changed = true;
      }
    }
  }
  return changed;
}

/** Trouver un ticket et sa position */
function findTicket(db, id) {
  for (const col of ["todo", "doing", "done"]) {
    const idx = (db[col] || []).findIndex((t) => t.id === id);
    if (idx >= 0) return { col, idx, ticket: db[col][idx] };
  }
  return null;
}

/** Déplacer un ticket vers une colonne */
function moveTicket(db, id, to) {
  const found = findTicket(db, id);
  if (!found) return null;
  const { col, idx, ticket } = found;
  db[col].splice(idx, 1);
  db[to] ??= [];
  db[to].push(ticket);
  return { from: col, to, ticket };
}

/* ---------- Bootstrap: s'assurer des numéros ---------- */
await withDB((db) => {
  db.todo ??= [];
  db.doing ??= [];
  db.done ??= [];
  const changed = migrateAddNumbers(db);
  return { value: null }; // on persiste si changed (writeDB se fait quand persist !== false)
});

/* ---------- Routes ---------- */

// GET /api/tickets[?column=todo|doing|done]
app.get("/api/tickets", async (req, res) => {
  const data = await withDB((db) => ({ value: db, persist: false }));
  const { column } = req.query;
  if (column) {
    if (!data[column]) return res.status(400).json({ error: "Column invalide" });
    return res.json({ [column]: data[column] });
  }
  return res.json({
    todo: data.todo ?? [],
    doing: data.doing ?? [],
    done:  data.done  ?? []
  });
});

// POST /api/tickets { title, subtitle, column? }
// → attribue automatiquement un numéro de 1 à 50 (champ "no")
app.post("/api/tickets", async (req, res) => {
  const { title, subtitle, column = "todo" } = req.body || {};
  if (!title || !subtitle) return res.status(400).json({ error: "title et subtitle requis" });

  let ticket;
  const ok = await withDB((db) => {
    const n = nextFreeNumber(db);
    if (!n) {
      return { value: null, persist: false }; // pas de place
    }
    ticket = { id: nanoid(), no: n, title, subtitle };
    db[column] ??= [];
    db[column].push(ticket);
    return { value: ticket };
  });

  if (!ticket) {
    return res.status(409).json({ error: "Capacité atteinte: 50 tickets numérotés" });
  }
  res.status(201).json(ticket);
});

// DELETE /api/tickets/:id
// → libère le numéro pour de futurs tickets
app.delete("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;
  let removed = null;
  await withDB((db) => {
    for (const col of ["todo", "doing", "done"]) {
      const idx = db[col]?.findIndex((t) => t.id === id);
      if (idx >= 0) {
        removed = db[col][idx];
        db[col].splice(idx, 1);
        break;
      }
    }
    return { value: removed };
  });
  if (!removed) return res.status(404).json({ error: "Ticket introuvable" });
  res.json({ ok: true, removed });
});

// PATCH /api/tickets/:id/move { to: "todo"|"doing"|"done" } (générique, conserve)
app.patch("/api/tickets/:id/move", async (req, res) => {
  const { id } = req.params;
  const { to } = req.body || {};
  if (!["todo", "doing", "done"].includes(to)) {
    return res.status(400).json({ error: "Colonne cible invalide" });
  }
  let moved = null;
  await withDB((db) => {
    const result = moveTicket(db, id, to);
    return { value: result };
  });
  if (!moved) return res.status(404).json({ error: "Ticket introuvable" });
  res.json({ ok: true, moved });
});

// --- NOUVEAU ---
// POST /api/tickets/:id/start  → "À faire" → "En cours"
app.post("/api/tickets/:id/start", async (req, res) => {
  const { id } = req.params;
  let result = null;
  await withDB((db) => {
    const found = findTicket(db, id);
    if (!found) return { value: null, persist: false };
    if (found.col !== "todo") {
      return { value: { error: "Transition invalide: doit venir de 'todo'" }, persist: false };
    }
    result = moveTicket(db, id, "doing");
    return { value: result };
  });
  if (!result) return res.status(404).json({ error: "Ticket introuvable" });
  if (result.error) return res.status(400).json(result);
  res.json({ ok: true, moved: result });
});

// --- NOUVEAU ---
// POST /api/tickets/:id/complete → "En cours" → "Terminé"
app.post("/api/tickets/:id/complete", async (req, res) => {
  const { id } = req.params;
  let result = null;
  await withDB((db) => {
    const found = findTicket(db, id);
    if (!found) return { value: null, persist: false };
    if (found.col !== "doing") {
      return { value: { error: "Transition invalide: doit venir de 'doing'" }, persist: false };
    }
    // option: timestamp de complétion
    found.ticket.completedAt = new Date().toISOString();
    result = moveTicket(db, id, "done");
    return { value: result };
  });
  if (!result) return res.status(404).json({ error: "Ticket introuvable" });
  if (result.error) return res.status(400).json(result);
  res.json({ ok: true, moved: result });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API tickets → http://localhost:${PORT}`));
