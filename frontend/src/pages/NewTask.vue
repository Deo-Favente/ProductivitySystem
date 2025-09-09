<script setup>
import { ref, computed } from "vue";
import { useTickets } from "../composables/useTickets";

const { addTicket } = useTickets();

const title = ref("");
const subtitle = ref("");
const column = ref("todo");
const loading = ref(false);
const errorMsg = ref("");

const canSubmit = computed(() =>
  title.value.trim().length >= 2 && !loading.value
);

async function submit() {
  errorMsg.value = "";
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    await addTicket({
      title: title.value.trim(),
      subtitle: subtitle.value.trim(),
      column: column.value
    });
    
    alert("Tâche créée avec succès !");
  } catch (e) {
    errorMsg.value = "Échec de la création. Réessaie.";
    console.error(e);
  } finally {
        // Afficher un message de succès
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-white flex flex-col" style="cursor: auto;">
    <!-- Header mobile -->
    <div class="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 flex justify-center">
      <div class="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
        <a class="text-blue-600 font-medium" href="/">Retour</a>
        <h1 class="text-lg font-semibold">Nouvelle tâche</h1>
      </div>
    </div>

    <!-- Formulaire -->
    <form class="mx-auto w-full max-w-md p-4 flex-1 flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700">Titre</label>
        <input
          id="title"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="Ex: Travailler sur le projet X"
          class="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          v-model="title"
        />
      </div>

      <div>
        <label for="subtitle" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="subtitle"
          rows="4"
          placeholder="Détaille ce qu'il faut faire…"
          
          class="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          v-model="subtitle"
        />
      </div>

      <fieldset class="mt-1">
        <legend class="block text-sm font-medium text-gray-700 mb-2">Colonne</legend>
        <div class="flex gap-3 justify-center">
          <label class="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm"
                 :class="column==='todo'  ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'">
            <input type="radio" name="col" class="sr-only" value="todo" v-model="column" />
            À faire
          </label>
          <label class="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm"
                 :class="column==='doing' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'">
            <input type="radio" name="col" class="sr-only" value="doing" v-model="column" />
            En cours
          </label>
        </div>
      </fieldset>

      <!-- Instructions pour remplir -->
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <strong class="font-medium text-yellow-800">Instructions</strong><br>
          <ul class="list-disc list-inside mt-1 space-y-1 text-yellow-800 text-sm">
            <li> <strong>Les tâches non liées au travail</strong> (vie perso) vont dans l'<strong>appli mobile</strong>.</li>
            <li> <strong>Les rendez-vous non déplaçables, habituels</strong> (ex: cours) ou ponctuels (ex: psy, médecin) <strong>vont dans le calendrier.</strong></li>
            <li> Une tâche doit être <strong>claire, atomique, mesurable en résultats</strong> (fait / pas fait).</li>
            <li> Il est conseillé de <strong>découper les grosses tâches</strong> en sous-tâches plus petites. Chaque ticket doit durer <strong>quelques heures maximum.</strong></li>
           </ul>
      </div>

      <p v-if="errorMsg" class="text-red-600 text-sm">{{ errorMsg }}</p>

      <!-- Bouton submit collant en bas (ergonomique mobile) -->
      <div class="sticky bottom-0 bg-white/90 backdrop-blur pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="mx-auto max-w-md px-4">
          <button
            type="submit"
            :disabled="!canSubmit"
            class="w-full rounded-2xl px-4 py-3 text-white text-base font-semibold
                   bg-blue-600 disabled:bg-blue-300 active:scale-[.99] transition"
          >
            {{ loading ? 'Création…' : 'Créer la tâche' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
