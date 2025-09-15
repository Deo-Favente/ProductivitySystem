/*
  Nom : Home.vue
  Description : Page principale affichant les tickets et les métriques.
  Auteur : Deo-Favente
*/

<script setup>
// Imports
import { onMounted, ref } from "vue";
import Ticket from "../components/Ticket.vue";
import { setPaperZone } from
  "../lib/paper.js";
import { useTickets } from "../composables/useTickets";
import { useMetrics } from
  "../composables/useMetrics";

const zoneVerte = ref(null);
const { todo, doing, done, lastStartedId, loadAll, loadMeta,
  deleteTicket } = useTickets();
const { amount, growth, loadMetrics } = useMetrics();

onMounted(async () => {
  // 1) brancher paper.js sur la vraie zone DOM
  setPaperZone(zoneVerte.value);

  // 2) charger les données ; le composable appellera chargerPapier()
  await Promise.all([loadAll(), loadMeta(), loadMetrics()]);
  setInterval(() => {
    loadAll(); loadMeta(); loadMetrics();
  }, 5000);
}); 

// Supprimer un ticket
function handleRemove(id) { deleteTicket(id).catch(console.error); }
</script>

<template>
  <section class="h-[100dvh] box-border p-6 overflow-scroll no-scrollbar">
    <div class="grid sm:grid-cols-1 md:grid-cols-4 h-full min-h-0 gap-6"> 
      <!-- À faire -->
      <div class="bg-rouge rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">À faire</h1>
        <div class="carousel">
          <div class="conteneur-ticket w-full flex flex-col items-center autoscroll">
            <Ticket v-for="t in todo" :key="t.id" v-bind="t" @remove="handleRemove" />
          </div>
        </div>
      </div> 
      <!-- En Cours -->
      <div class="bg-orang rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">En cours</h1>
        <div class="conteneur-ticket w-full flex flex-col items-center">
          <Ticket v-for="t in doing" :key="t.id" v-bind="t" @remove="handleRemove" />
        </div>
      </div>
      <!-- Terminé -->
      <div id="zone-verte" ref="zoneVerte"
        class="hidden bg-vert rounded-xl items-start justify-center text-gray-700 text-xl font-bold min-h-[260px] overflow-hidden md:flex">
        <h1 class="mt-3 text-2xl">Terminé ({{ done.length }})</h1>
      </div> 
      <!-- Panneau de droite (dernière tâche / montant / croissance) -->
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
          <h1>Croissance par rapport à la dernière entrée</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl"> {{ growth.toFixed(1) }}% </h2>
        </div>
        <div class="flex flex-col min-h-0 w-full">
          <div class="flex items-center font-bold text-[clamp(1rem,3vw,2rem)] w-full">
            <div id="agenda-app" class="w-full">
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>