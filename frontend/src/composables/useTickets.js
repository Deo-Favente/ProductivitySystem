// src/composables/useTickets.js
import { ref } from "vue";
import { chargerPapier } from "../paper.js"; 

const API = import.meta.env.VITE_API_BASE || "/api";
const api = (path="") => `${API}${path.startsWith("/") ? path : `/${path}`}`;


const todo  = ref([]);
const doing = ref([]);
const done  = ref([]);
const lastStartedId = ref(null);

function notifyPaper() {
  try { chargerPapier(done.value.length); } catch (e) { /* paper non initialisé ? */ }
}

export async function loadAll() {
  const res = await fetch(api(`/tickets`));
  if (!res.ok) throw new Error(`GET /api/tickets -> ${res.status}`);
  const data = await res.json();
  todo.value  = data.todo  ?? [];
  doing.value = data.doing ?? [];
  done.value  = data.done  ?? [];
  notifyPaper(); // synchronise les papiers au démarrage
}

async function loadMeta() {
  const res = await fetch(api(`/meta`));
  if (!res.ok) throw new Error(`GET /api/meta -> ${res.status}`);
  const data = await res.json();
  lastStartedId.value = data.lastStartedId ?? null;
}

async function addTicket({ title, subtitle, column = "todo" }) {
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
  const res = await fetch(api(`/tickets/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression échouée");
  for (const list of [todo, doing, done]) {
    const i = list.value.findIndex((t) => t.id === id);
    if (i !== -1) list.value.splice(i, 1);
  }
  // (option) si tu veux refléter la baisse en zone verte, déduis ici si c'était un done
  notifyPaper();
}

async function startTicket(id) {
  const res = await fetch(api(`/tickets/${id}/start`), { method: "POST" });
  if (!res.ok) throw new Error("Start échoué");
  const i = todo.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = todo.value.splice(i, 1)[0];
    doing.value.push(t);
  }
  lastStartedId.value = id;
}

async function completeTicket(id) {
  const res = await fetch(api(`/tickets/${id}/complete`), { method: "POST" });
  if (!res.ok) throw new Error("Completion échouée");
  const i = doing.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = doing.value.splice(i, 1)[0];
    done.value.push(t);
  }
  notifyPaper(); // MAJ des papiers quand un ticket passe en "Terminé"
}

export function useTickets() {
  return {
    todo, doing, done,
    lastStartedId, loadAll, loadMeta,
    addTicket, deleteTicket,
    startTicket, completeTicket
  };
}
