<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const events = ref([]);
const loading = ref(true);

const API_KEY = import.meta.env.VITE_API_KEY;
const CALENDAR_ID = import.meta.env.VITE_CALENDAR_ID;
const MAX_RESULTS = 5;
let intervalId = null;

async function loadEvents() {
  loading.value = true;
  try {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}&timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=${MAX_RESULTS}`;
    const res = await fetch(url);
    const data = await res.json();

    events.value = (data.items || []).map(ev => ({
      id: ev.id,
      title: ev.summary,
      start: ev.start.dateTime || ev.start.date,
      end: ev.end?.dateTime || ev.end?.date,
      location: ev.location || "-",
    }));
  } catch (err) {
    console.error("Erreur API:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadEvents(); // premier chargement immédiat
  intervalId = setInterval(loadEvents, 30_000); // toutes les 30s
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="w-full">
    <h2 class="text-xl text-center font-bold mb-4 text-gray-800">📅 Prochains événements</h2>

    <div v-if="loading" class="text-gray-500">Chargement...</div>
    <div v-else-if="events.length === 0" class="text-gray-400 text-lg text-center">Aucun événement à venir</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full border border-gray-200 bg-white overflow-hidden text-sm sm:text-base">
        <thead class="bg-gray-100">
          <tr>
            <th class="text-xs border-b border-gray-200 text-center">Titre</th>
            <th class="text-xs border-b border-gray-200 text-center">Début</th>
            <th class="text-xs border-b border-gray-200 text-center">Fin</th>
            <th class="text-xs border-b border-gray-200 text-center">Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id" class="hover:bg-gray-50">
            <td class="text-xs border-b border-gray-200 font-medium text-center text-wrap max-w-xs">{{ event.title }}
            </td>
            <td class="text-xs border-b border-gray-200 text-wrap text-center">{{ new
              Date(event.start).toLocaleDateString("fr-FR", {"hour": '2-digit', "minute": '2-digit'}) }}</td>
            <td class="text-xs border-b border-gray-200 text-wrap text-center">{{ new
              Date(event.end).toLocaleDateString("fr-FR", {"hour": '2-digit', "minute": '2-digit'}) }}</td>
            <td class="text-xs border-b border-gray-200 max-w-xs text-wrap text-center">{{ event.location }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>