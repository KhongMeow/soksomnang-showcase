<script setup lang="ts">
defineProps<{ title: string; onBack?: () => void }>()
</script>

<template>
  <div class="flex items-center gap-3 mb-6">
    <button
      v-if="onBack"
      type="button"
      @click="onBack"
      class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-[#0f2a4a] transition-colors flex-shrink-0"
    >
      <IconBack />
    </button>
    <h1 class="text-xl font-bold text-[#0f2a4a] flex-1">{{ title }}</h1>
    <slot name="right" />
  </div>
</template>
