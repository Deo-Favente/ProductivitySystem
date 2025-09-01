<script setup>
import { onMounted, onBeforeUnmount, watch, nextTick, ref } from "vue";
import Ticket from "../components/Ticket.vue";
import { setPaperZone } from "../lib/paper.js";
import { useTickets } from "../composables/useTickets";
import { useMetrics } from "../composables/useMetrics";

const zoneVerte = ref(null);
const { todo, doing, done, lastStartedId, loadAll, loadMeta, deleteTicket } = useTickets();
const { amount, growth, loadMetrics } = useMetrics();

const contTodo = ref(null);
const contDoing = ref(null);
const loopTodo = ref(null);
const loopDoing = ref(null);

// Instances d'animation WAAPI pour pouvoir pause/recreate
let animTodo = null;
let animDoing = null;

let ro; // ResizeObserver partagé (compatible Chromium récent – sinon on fallback)

function makePingPong(containerEl, innerEl) {
  // stop anim existante
  const prev = innerEl.getAnimations ? innerEl.getAnimations() : [];
  prev.forEach(a => a.cancel());

  // accessibilité
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  // calcul distance réelle à scroller
  const distance = innerEl.scrollHeight - containerEl.clientHeight;
  if (distance <= 0) return; // ne dépasse pas → pas d'animation

  // Utilise translate3d pour forcer la composante GPU (utile sur Pi)
  const keyframes = [
    { transform: "translate3d(0, 0, 0)" },
    { transform: `translate3d(0, ${-distance}px, 0)` },
  ];

  // Durée : convertit --scroll-speed (CSS) en ms ; fallback 50s
  const styleSpeed = getComputedStyle(document.documentElement).getPropertyValue("--scroll-speed").trim();
  // parse “50s” → 50
  const seconds = styleSpeed.endsWith("s") ? parseFloat(styleSpeed) : 50;
  const duration = seconds * 1000;

  const anim = innerEl.animate(keyframes, {
    duration,
    iterations: Infinity,
    direction: "alternate",
    easing: "linear",
    fill: "both",
  });

  // pause au survol
  const onEnter = () => anim.pause();
  const onLeave = () => anim.play();
  containerEl.addEventListener("mouseenter", onEnter);
  containerEl.addEventListener("mouseleave", onLeave);

  // Nettoyage quand l’animation se recrée
  anim.onfinish = () => {
    containerEl.removeEventListener("mouseenter", onEnter);
    containerEl.removeEventListener("mouseleave", onLeave);
  };

  return anim;
}

async function recalcOne(containerRef, innerRef, storeSetter) {
  await nextTick();
  const c = containerRef.value;
  const i = innerRef.value;
  if (!c || !i) return;

  // (re)crée l'animation
  const anim = makePingPong(c, i);
  storeSetter(anim || null);
}

async function recalcAll() {
  await nextTick();
  await recalcOne(contTodo,  loopTodo,  a => animTodo  = a);
  await recalcOne(contDoing, loopDoing, a => animDoing = a);
}

onMounted(async () => {
  setPaperZone(zoneVerte.value);
  await Promise.all([loadAll(), loadMeta(), loadMetrics()]);
  setInterval(() => { loadAll(); loadMeta(); loadMetrics(); }, 5000);

  // ResizeObserver pour recalculer à la volée
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(() => { recalcAll(); });
    contTodo.value && ro.observe(contTodo.value);
    loopTodo.value && ro.observe(loopTodo.value);
    contDoing.value && ro.observe(contDoing.value);
    loopDoing.value && ro.observe(loopDoing.value);
  } else {
    // Fallback Pi très ancien : recalc sur resize
    window.addEventListener("resize", recalcAll);
  }

  // 1er passage
  recalcAll();
});

onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  else window.removeEventListener("resize", recalcAll);

  // Cancel propre
  try { animTodo?.cancel(); } catch {}
  try { animDoing?.cancel(); } catch {}
});

// Recalcule quand le contenu change
watch([todo, doing], () => recalcAll(), { deep: true });

function handleRemove(id) { deleteTicket(id).catch(console.error); }
</script>

<template>
  <section class="h-[100dvh] box-border p-6 overflow-scroll no-scrollbar">
    <div class="grid sm:grid-cols-1 md:grid-cols-4 h-full min-h-0 gap-6">
      <!-- À faire (ROUGE) -->
      <div class="bg-rouge rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">À faire</h1>
        <div ref="contTodo" class="conteneur-ticket w-full flex flex-col items-center">
          <div ref="loopTodo" class="scroll-loop w-full items-center">
            <Ticket v-for="t in todo" :key="t.id" v-bind="t" @remove="handleRemove" />
          </div>
        </div>
      </div>

      <!-- En cours (ORANGE) -->
      <!-- En cours (ORANGE) -->
      <div class="bg-orang rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">En cours</h1>
        <div ref="contDoing" class="conteneur-ticket w-full flex flex-col items-center">
          <div ref="loopDoing" class="scroll-loop w-full items-center">
            <Ticket v-for="t in doing" :key="t.id" v-bind="t" @remove="handleRemove" />
          </div>
        </div>
      </div>

      <div id="zone-verte" ref="zoneVerte"
        class="hidden bg-vert rounded-xl items-start justify-center text-gray-700 text-xl font-bold min-h-[260px] overflow-hidden md:flex">
        <h1 class="mt-3 text-2xl">Terminé ({{ done.length }})</h1>
      </div> <!-- Panneau de droite (dernière tâche / montant / croissance) -->
      <div class="grid-rows-[1fr_1fr_1fr_2fr] min-h-0 gap-5 hidden md:grid">
        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center text-gray-800 text-center p-2">
          <h1 class="font-bold">Dernière tâche démarrée</h1>
          <h2 class="font-medium text-2xl sm:text-4xl md:text-5xl break-all"> {{ lastStartedId ?? '—' }} </h2>
        </div>
        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center font-bold text-gray-800 min-h-0">
          <h1>Montant total</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl"> {{ amount.toLocaleString('fr-FR') }} € </h2>
        </div>
        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center font-bold text-gray-800 min-h-0">
          <h1>Croissance</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl"> {{ growth.toFixed(1) }}% </h2>
        </div>
        <div class="flex flex-col min-h-0 w-full">
          <div class="flex items-center font-bold text-[clamp(1rem,3vw,2rem)] w-full">
            <div id="agenda-app" class="w-full"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>