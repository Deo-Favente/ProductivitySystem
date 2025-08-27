<template>
  <div
    class="relative bg-white flex flex-col items-center mt-5 w-55 rounded p-3 fond-ticket cursor-pointer select-none shadow-sm hover:shadow-md transition"
    @click="toggleClose"
  >
    <!-- Bouton croix (apparait après le 1er clic) -->
    <button
      v-if="showClose"
      @click.stop="emit('remove', id)"
      class="absolute right-2 h-8 w-8 rounded-full bg-red-500 text-white text-xl flex items-center justify-center"
      aria-label="Supprimer le ticket"
      title="Supprimer"
    >
      ✕
    </button>

    <h2 class="font-bold">{{ title }}</h2>
    <h3 class="font-normal text-center whitespace-pre-line break-words">
      {{ subtitle }}
    </h3>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  id: { type: [String, Number], required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
});

const emit = defineEmits(["remove"]);

const showClose = ref(false);

function toggleClose() {
  showClose.value = !showClose.value;
}
</script>
