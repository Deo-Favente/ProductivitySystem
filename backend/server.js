import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { withDB } from "./storage.js";

const app = express();
app.use(cors()); // si tu n’utilises pas de proxy Vite
app.use(express.json());

// GET tous les tickets (optionnel: ?column=todo|doing|done)
app.get("/api/tickets", async (req, res) => {
  const { column } = req.query;
  const data = await withDB((db) => ({ value: db, persist: false }));
  if (column) {
    if (!data[column]) return res.status(400).json({ error: "Column invalide" });
    return res.json({ [column]: data[column] });
  }
  res.json(data);
});

// POST ajouter un ticket { title, subtitle, column }
app.post("/api/tickets", async (req, res) => {
  const { title, subtitle, column = "todo" } = req.body || {};
  if (!title || !subtitle) {
    return res.status(400).json({ error: "title et subtitle requis" });
  }
  const id = nanoid();
  const ticket = { id, title, subtitle };

  const result = await withDB((db) => {
    db[column] ??= [];
    db[column].push(ticket);
    return { value: ticket };
  });

  res.status(201).json(result);
});

// DELETE supprimer un ticket par id (dans n’importe quelle colonne)
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

// (Optionnel) PATCH déplacer un ticket vers une autre colonne
app.patch("/api/tickets/:id/move", async (req, res) => {
  const { id } = req.params;
  const { to } = req.body || {};
  if (!["todo", "doing", "done"].includes(to)) {
    return res.status(400).json({ error: "Colonne cible invalide" });
  }
  let moved = null;
  await withDB((db) => {
    let ticket = null;
    for (const col of ["todo", "doing", "done"]) {
      const idx = db[col]?.findIndex((t) => t.id === id);
      if (idx >= 0) {
        ticket = db[col].splice(idx, 1)[0];
        break;
      }
    }
    if (!ticket) return { value: null, persist: false };
    db[to].push(ticket);
    moved = { ...ticket };
    return { value: moved };
  });

  if (!moved) return res.status(404).json({ error: "Ticket introuvable" });
  res.json({ ok: true, moved });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API tickets sur http://localhost:${PORT}`);
});
