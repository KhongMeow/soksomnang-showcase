<script setup lang="ts">
defineProps<{ label: string; value: string; highlight?: boolean }>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2.5 rounded-xl" :class="highlight ? 'bg-[#e0f9fb]' : 'bg-gray-50'">
    <span class="text-sm text-gray-600">{{ label }}</span>
    <span class="text-base font-bold" :class="highlight ? 'text-[#0f2a4a]' : 'text-gray-800'">{{ value }}</span>
  </div>
</template>
