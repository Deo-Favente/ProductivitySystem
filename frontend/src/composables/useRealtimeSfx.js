// src/composables/useRealtimeSfx.js
import { ref } from "vue";
import { sfx } from "../lib/sfx"; // ajuste le chemin si besoin

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/,"");
const api = (p="") => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

export function useRealtimeSfx() {
  const timer = ref(null);
  let prevDoing = new Set();
  let prevDone  = new Set();

  async function fetchTickets() {
    const r = await fetch(api("/tickets"));
    if (!r.ok) throw new Error("fetch tickets failed");
    return r.json();
  }

  function setsFrom(tickets) {
    const doing = new Set((tickets.doing || []).map(t => t.id));
    const done  = new Set((tickets.done  || []).map(t => t.id));
    return { doing, done };
  }

  async function tick(onUpdate) {
    try {
      const tickets = await fetchTickets();

      // détecter transitions
      const { doing, done } = setsFrom(tickets);

      // START: ids apparus dans doing qui n'y étaient pas
      for (const id of doing) {
        if (!prevDoing.has(id)) sfx.start();
      }
      // COMPLETE: ids apparus dans done qui n'y étaient pas
      for (const id of done) {
        if (!prevDone.has(id)) sfx.complete();
      }

      prevDoing = doing;
      prevDone  = done;

      // pousse l’état au store/pages si tu veux rafraîchir l’UI
      onUpdate?.(tickets);
    } catch (e) {
      // son d’info si erreur réseau optionnel :
      // sfx.info();
      // console.warn(e);
    }
  }

  function start(onUpdate, intervalMs = 1500) {
    if (timer.value) return;
    // initial
    tick(onUpdate);
    timer.value = setInterval(() => tick(onUpdate), intervalMs);
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  }

  return { start, stop };
}
