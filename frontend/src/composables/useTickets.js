/*
  Nom : useTickets.js
  Description : Composable pour gérer les tickets (chargement, ajout, suppression, déplacement)
  Auteur : Deo-Favente
*/

import { ref } from "vue";
import { chargerPapier } from "../lib/paper.js";

const API = import.meta.env.VITE_API_BASE || "/api";
const api = (path = "") => `${API}${path.startsWith("/") ? path : `/${path}`}`; // Fonction pour construire les URLs d'API

const todo = ref([]);
const doing = ref([]);
const done = ref([]);
const lastStartedId = ref(null);

function notifyPaper() {
  // Notifier le module papier.js du nombre de tickets "done"
  try {
    chargerPapier(done.value.length);
  } catch (e) { /* paper non initialisé*/ }
}

export async function loadAll() {
  // Charger tous les tickets depuis l'API
  const res = await fetch(api(`/tickets`));
  if (!res.ok) throw new Error(`GET /api/tickets -> ${res.status}`);

  const data = await res.json();
  todo.value = data.todo ? data.todo : [];
  doing.value = data.doing ? data.doing : [];
  done.value = data.done ? data.done : [];
  notifyPaper(); // synchronise les papiers au démarrage
}

async function loadMeta() {
  // Charger les infos méta (lastStartedId)
  const res = await fetch(api(`/meta`));
  if (!res.ok) throw new Error(`GET /api/meta -> ${res.status}`);
  const data = await res.json();
  lastStartedId.value = data.lastStartedId ? data.lastStartedId : null;
}

async function addTicket({ title, subtitle = "", column = "todo" }) {
  // Ajouter un ticket via l'API
  const res = await fetch(api(`/tickets`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, subtitle, column })
  });

  if (!res.ok) throw new Error("Ajout échoué");
  const t = await res.json();
  (column === "todo" ? todo : column === "doing" ? doing : done).value.push(t);
}

async function deleteTicket(id) {
  // Supprimer un ticket via l'API
  const res = await fetch(api(`/tickets/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression échouée");
  for (const list of [todo, doing, done]) {
    const i = list.value.findIndex((t) => t.id === id);
    if (i !== -1) list.value.splice(i, 1);
  }
  notifyPaper();
}

async function startTicket(id) {
  // Démarrer un nouveau ticket (le passer en "doing")
  const res = await fetch(api(`/tickets/${id}/start`), { method: "POST" });
  if (!res.ok) throw new Error("Start échoué");
  const i = todo.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = todo.value.splice(i, 1)[0]; // Retirer de "todo"
    doing.value.push(t); // Ajouter à "doing"
  }
  lastStartedId.value = id;
}

async function completeTicket(id) {
  // Compléter un ticket (le passer en "done")
  const res = await fetch(api(`/tickets/${id}/complete`), { method: "POST" });
  if (!res.ok) throw new Error("Completion échouée");
  const i = doing.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = doing.value.splice(i, 1)[0]; // Retirer de "doing"
    done.value.push(t); // Ajouter à "done"
  }
  notifyPaper(); 
}

export function useTickets() {
  return {
    todo, doing, done,
    lastStartedId, loadAll, loadMeta,
    addTicket, deleteTicket,
    startTicket, completeTicket
  };
}