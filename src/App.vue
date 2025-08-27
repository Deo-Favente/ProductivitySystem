<template>
  <section class="h-[100dvh] box-border p-6 overflow-scroll no-scrollbar">
    <div class="grid sm:grid-cols-1 md:grid-cols-4 h-full min-h-0 gap-6">

      <!-- Colonne rouge -->
      <div class="bg-rouge rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">À Faire</h1>
        <div class="conteneur-ticket w-full flex flex-col items-center">
          <Ticket
            v-for="t in todo"
            :key="t.id"
            :id="t.id"
            :title="t.title"
            :subtitle="t.subtitle"
            @remove="removeFrom('todo', $event)"
          />
        </div>
      </div>

      <!-- Colonne orange -->
      <div class="bg-orang rounded-xl flex flex-col items-center text-gray-700 text-xl font-bold min-h-0">
        <h1 class="mt-3 text-2xl">En Cours</h1>
        <div class="conteneur-ticket w-full flex flex-col items-center">
          <Ticket
            v-for="t in doing"
            :key="t.id"
            :id="t.id"
            :title="t.title"
            :subtitle="t.subtitle"
            @remove="removeFrom('doing', $event)"
          />
        </div>
      </div>

      <!-- Colonne verte -->
      <div id="zone-verte" class="bg-vert rounded-xl md:flex justify-center text-gray-700 text-xl font-bold min-h-0 hidden">
        <h1 class="mt-3 text-2xl">Terminé</h1>
      </div>

      <!-- Panneau de droite (inchangé) -->
      <div class="grid-rows-[1fr_1fr_1fr_2fr] min-h-0 gap-5 hidden md:grid">
        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center text-gray-800 text-center p-2">
          <h1 class="font-bold">Tâche en cours</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl">#54</h2>
        </div>

        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center font-bold text-gray-800 min-h-0">
          <h1>Montant total</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl">150€</h2>
        </div>

        <div class="bg-gray-400 rounded-xl flex flex-col items-center justify-center font-bold text-gray-800 min-h-0">
          <h1>Croissance sur le mois</h1>
          <h2 class="font-medium text-4xl sm:text-5xl md:text-6xl">10%</h2>
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

<script setup>
import { ref } from "vue";
import Ticket from "./components/Ticket.vue";

// Données exemples (ids uniques)
const todo = ref([
  { id: 1, title: "Tâche #1", subtitle: "Ranger le bureau" },
  { id: 2, title: "Tâche #2", subtitle: "Vendre le stock" },
]);

const doing = ref([
  {
    id: 3,
    title: "Tâche #1",
    subtitle:
      "Refaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs",
  },
  {
    id: 4,
    title: "Tâche #1",
    subtitle:
      "Refaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs",
  },
  {
    id: 5,
    title: "Tâche #1",
    subtitle:
      "Refaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs\nRefaire les pubs",
  },
]);

// util pour accéder à la bonne liste
const lists = { todo, doing };

function removeFrom(listName, id) {
  const listRef = lists[listName];
  if (!listRef) return;
  const i = listRef.value.findIndex((t) => t.id === id);
  if (i !== -1) listRef.value.splice(i, 1);
}
</script>
