// src/composables/useMetrics.js
import { ref } from "vue";
const API = import.meta.env.VITE_API_BASE || "";

const amount = ref(0);
const growth = ref(0);

async function loadMetrics() {
  const res = await fetch(`${API}/api/metrics`);
  if (!res.ok) throw new Error(`GET /api/metrics -> ${res.status}`);
  const data = await res.json();
  amount.value = Number(data.currentAmount || 0);
  growth.value = Number(data.growthPercent || 0);
}

async function submitAmount(newAmount) {
  const res = await fetch(`${API}/api/metrics/amount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: newAmount })
  });
  if (!res.ok) throw new Error("Envoi du montant échoué");
  const data = await res.json();
  amount.value = Number(data.currentAmount || 0);
  growth.value = Number(data.growthPercent || 0);
}

export function useMetrics() {
  return { amount, growth, loadMetrics, submitAmount };
}
