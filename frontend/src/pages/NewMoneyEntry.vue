<script setup>
import { ref, computed } from "vue";
import { useMetrics } from "../composables/useMetrics";

const { submitAmount } = useMetrics();

const amount = ref("");
const loading = ref(false);
const errorMsg = ref("");

const canSubmit = computed(() => {
  const value = parseFloat(amount.value);
  return (
    !loading.value &&
    !isNaN(value) &&
    isFinite(value)
    //value >= 1.0
  );
});

async function submit() {
  errorMsg.value = "";
  if (!canSubmit.value) return;
  loading.value = true;
  console.log("Submitting amount:", amount.value);
  try {
    await submitAmount(parseFloat(amount.value));
    
    alert("Entrée créée avec succès !");
  } catch (e) {
    errorMsg.value = "Échec de l'envoi. Réessaie.";
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
        <button @click="$router.back()" class="text-blue-600 font-medium">Retour</button>
        <h1 class="text-lg font-semibold">Nouvelle entrée d'argent</h1>
      </div>
    </div>

    <!-- Formulaire pour nouvelle entrée d'argent -->
    <form class="mx-auto w-full max-w-md p-4 flex-1 flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label for="amount" class="block text-sm font-medium text-gray-700">
          Montant (en €)
        </label>
        <input
          id="amount"
          type="number"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Ex: 49.99"
          class="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinners"
          v-model="amount"
          step="0.1"
      />
      </div>

      <!-- Instructions pour remplir -->
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800 text-sm">
        <strong class="font-semibold">Instructions :</strong>
        <p>
          Entrer le montant positif en euros. Par exemple, pour 49.99€, entrer <strong>49.99</strong>.
          Le chiffre correspondra au montant actuel de la trésorerie. (approximatif)
        </p>
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
            {{ loading ? 'En cours...' : 'Envoyer le montant' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
