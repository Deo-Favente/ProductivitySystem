<template>
  <div
    class="relative bg-white flex flex-col w-65 items-center mt-5 rounded p-3 fond-ticket cursor-pointer select-none hover:shadow-md transition"
    @click="toggleClose"
  >
    <!-- Croix = supprimer -->
    <button
      v-if="showClose"
      @click.stop="emit('remove', id)"
      class="absolute right-2 h-8 w-8 rounded-full bg-gray-800/90 text-white text-xl flex items-center justify-center"
      aria-label="Supprimer"
      title="Supprimer"
    >
      ✕
    </button>
    <h2 class="font-bold"> #{{ id }} {{ title }}</h2>
    <h3 class="font-normal text-center whitespace-pre-line break-words">{{ subtitle }}</h3>
  </div>
</template>

<script setup>
import { ref } from "vue";
const props = defineProps({
  id: { type: [String, Number], required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  no: { type: Number, default: null }
});
const emit = defineEmits(["remove"]);
const showClose = ref(false);
function toggleClose() { showClose.value = !showClose.value; }
</script>
