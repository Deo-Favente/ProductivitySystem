/*
  Nom : useMetrics.js
  Description : Composable pour gérer les métriques (montant et croissance)
  Auteur : Deo-Favente
*/

// Imports
import { ref } from "vue";
const API = import.meta.env.VITE_API_BASE || "/api";
const api = (path="") => `${API}${path.startsWith("/") ? path : `/${path}`}`; // Fonction pour construire les URLs d'API

const amount = ref(0);
const growth = ref(0);

async function loadMetrics() {
  // Charger les métriques depuis l'API
  const res = await fetch(api("/metrics"));
  if (!res.ok) throw new Error(`GET /api/metrics -> ${res.status}`);
  const data = await res.json();
  amount.value = Number(data.totalAmount || 0);
  growth.value = Number(data.growthPercent || 0);
}

async function submitAmount(newAmount) {
  // Envoyer un nouveau montant à l'API
  const res = await fetch(api("/metrics/amount"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: newAmount })
  });
  if (!res.ok) throw new Error("Envoi du montant échoué");
  const data = await res.json();
  amount.value = Number(data.totalAmount || 0);
  growth.value = Number(data.growthPercent || 0);
}

export function useMetrics() {
  return { amount, growth, loadMetrics, submitAmount };
}