// src/composables/useTickets.js
import { ref } from "vue";

const API = import.meta.env.VITE_API_BASE || "";

const todo = ref([]);
const doing = ref([]);
const done = ref([]);

import { chargerPapiers } from "../paper.js";
function notifyPaper() { try { chargerPapiers(done.value.length); } catch (e) { console.error(e); } }

async function loadAll() {
  const res = await fetch(`${API}/api/tickets`);
  if (!res.ok) throw new Error(`GET /api/tickets -> ${res.status}`);
  const data = await res.json();
  todo.value = Array.isArray(data.todo) ? data.todo : [];
  doing.value = Array.isArray(data.doing) ? data.doing : [];
  done.value = Array.isArray(data.done) ? data.done : [];
  // synchro initiale (optionnel)
  notifyPaper();
}

async function addTicket({ title, subtitle, column = "todo" }) {
  const res = await fetch(`${API}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, subtitle, column })
  });
  if (!res.ok) throw new Error("Ajout échoué");
  const ticket = await res.json();
  if (column === "todo") todo.value.push(ticket);
  if (column === "doing") doing.value.push(ticket);
  if (column === "done") done.value.push(ticket);
}

async function deleteTicket(id) {
  const res = await fetch(`${API}/api/tickets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression échouée");
  for (const list of [todo, doing, done]) {
    const i = list.value.findIndex((t) => t.id === id);
    if (i !== -1) list.value.splice(i, 1);
  }
}

// --- API ONLY: démarrer (À faire -> En cours)
async function startTicket(id) {
  const res = await fetch(`${API}/api/tickets/${id}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Start échoué");
  const { moved } = await res.json(); // { from:"todo", to:"doing", ticket:{...} }

  // maj locales
  const i = todo.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = todo.value.splice(i, 1)[0];
    doing.value.push(t);
  }
}

// --- API ONLY: compléter (En cours -> Terminé) + rappel char_papier
async function completeTicket(id) {
  const res = await fetch(`${API}/api/tickets/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error("Completion échouée");
  const { moved } = await res.json(); // { from:"doing", to:"done", ticket:{...} }

  const i = doing.value.findIndex(t => t.id === id);
  if (i !== -1) {
    const t = doing.value.splice(i, 1)[0];
    done.value.push(t);
  }

  // >>> rappelle l'animation papier avec le nouveau total terminé
  notifyPaper();
}

export function useTickets() {
  return {
    todo, doing, done,
    loadAll, addTicket, deleteTicket,
    startTicket, completeTicket
  };
}
