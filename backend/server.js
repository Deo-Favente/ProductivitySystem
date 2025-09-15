/* 
    Nom : server.js
    Description : API REST pour la gestion de tickets (backend)
    Auteur : Deo-Favente
*/

// Imports
import express from "express";
import cors from "cors";
import { withDB } from "./storage.js";
import { migrateNumericIds, nextFreeId, findTicket, moveTicket, computeMetrics } from "./utils.js";

// Création de l'app Express
const app = express();
app.use(cors());
app.use(express.json());

// Démarrage de la db et migration si besoin
await withDB((db) => {
  migrateNumericIds(db);
  return { value: null }; // Ok
});

/* ----------------------- Routes API ----------------------- */

// GET /api/tickets
app.get("/api/tickets", async (_req, res) => {
  /* Renvoyer les tickets dans les 3 colonnes */
  const data = await withDB((db) => ({ value: db, persist: false }));
  res.json({
    todo: data.todo ? data.todo : [], // Si null, renvoyer []
    doing: data.doing ? data.doing : [],
    done: data.done ? data.done : []
  });
});

// POST /api/tickets { title, subtitle, column? }
app.post("/api/tickets", async (req, res) => {
  // Créer un ticket dans la colonne spécifiée (par défaut "todo")
  const { title, subtitle = "", column = "todo" } = req.body || {};
  if (!title) return res.status(400).json({ error: "Titre requis" });

  let created = null;
  await withDB((db) => {
    const id = nextFreeId(db); // id libre entre 1 et 50
    if (!id) return { value: null, persist: false }; // plein (50)
    const ticket = { id, title, subtitle };
    db[column] = db[column] ? db[column] : []; // init si null
    db[column].push(ticket); // ajouter le ticket à la colonne
    created = ticket;
    return { value: ticket }; // Renvoyer le ticket créé
  });

  if (!created) return res.status(409).json({ error: "Capacité atteinte: 50 tickets" });
  res.status(201).json(created);
});

// DELETE /api/tickets/:id
app.delete("/api/tickets/:id", async (req, res) => {
  // Supprimer un ticket par son id numérique
  const idNum = Number(req.params.id); // Parse du string en nombre
  if (!Number.isInteger(idNum) || idNum < 1 || idNum > 50) {
    return res.status(400).json({ error: "id doit être un entier entre 1 et 50" });
  }

  let removed = null;
  await withDB((db) => {
    const found = findTicket(db, idNum);
    if (!found) return { value: null, persist: false }; // Pas trouvé

    // Retirer le ticket de sa colonne
    const { col, idx, ticket } = found;
    db[col].splice(idx, 1);
    removed = ticket;
    return { value: removed }; // Renvoyer le ticket supprimé 
  });

  if (!removed) return res.status(404).json({ error: "Ticket introuvable" });
  res.json({ ok: true, removed });
});

// POST /api/tickets/:id/start
app.post("/api/tickets/:id/start", async (req, res) => {
  // Déplacer un ticket de "todo" vers "doing"
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum)) return res.status(400).json({ error: "id invalide" });

  let result = null;
  await withDB((db) => {
    const found = findTicket(db, idNum);
    if (!found || found.col !== "todo") return { value: null, persist: false };
    result = moveTicket(db, idNum, "doing");
    db.meta = db.meta ? db.meta : { nextId: 1, lastStartedId: null };
    db.meta.lastStartedId = idNum;
    return { value: result };
  });

  if (!result) return res.status(404).json({ error: "Ticket introuvable ou déjà en cours" });
  res.json({ ok: true, moved: result });
});

// POST /api/tickets/:id/complete
app.post("/api/tickets/:id/complete", async (req, res) => {
  // Déplacer un ticket de "doing" vers "done"
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

// GET /api/meta
app.get("/api/meta", async (_req, res) => {
  // Récupérer les métadonnées (lastStartedId)

  const meta = await withDB((db) => ({ value: db.meta ? db.meta : { nextId: 1, lastStartedId: null }, persist: false }));
  res.json({ lastStartedId: meta.lastStartedId ?? null });
});

// GET /api/metrics
app.get("/api/metrics", async (_req, res) => {
  // Récupérer les métriques (historique des montants)

  const data = await withDB((db) => ({ value: db.metrics ?? { amounts: [] }, persist: false }));
  res.json(computeMetrics(data));
});

// POST /api/metrics/amount 
app.post("/api/metrics/amount", async (req, res) => {
  // Ajouter un montant (amount: number) à l'historique des métriques

  const { amount } = req.body || {};
  const value = Number(amount);
  if (!Number.isFinite(value)) return res.status(400).json({ error: "amount doit être un nombre" });

  let out = null;
  await withDB((db) => {
    db.metrics = db.metrics ? db.metrics : { amounts: [] };
    db.metrics.amounts.push({ date: new Date().toISOString(), amount: value });
    out = computeMetrics(db.metrics);
    return { value: out };
  });

  res.status(201).json(out);
});

// Démarrage du serveur
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API tickets → http://localhost:${PORT}`);
});
