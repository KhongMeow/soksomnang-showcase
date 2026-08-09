<script setup lang="ts">
defineProps<{ value: "cash" | "bank" }>()
const emit = defineEmits<{ (e: "change", v: "cash" | "bank"): void }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button
      v-for="m in (['cash', 'bank'] as const)"
      :key="m"
      type="button"
      @click="emit('change', m)"
      class="py-3.5 rounded-xl border-2 font-bold text-base transition-all"
      :class="
        value === m
          ? 'bg-[#0f2a4a] border-[#0f2a4a] text-white shadow-md'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
      "
    >
      {{ m === "cash" ? "💵 Cash" : "🏦 Bank" }}
    </button>
  </div>
</template>
