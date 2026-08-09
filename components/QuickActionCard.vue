<script setup lang="ts">
defineProps<{
  label: string
  sub?: string
  color?: string
}>()

const emit = defineEmits<{ (e: "click"): void }>()
</script>

<template>
  <button
    type="button"
    @click="emit('click')"
    class="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-[#00b4c8] hover:shadow-md transition-all active:scale-95 group"
  >
    <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors" :style="{ backgroundColor: (color ?? '#0f2a4a') + '15' }">
      <span :style="{ color: color ?? '#0f2a4a' }" class="scale-100 group-hover:scale-110 transition-transform">
        <slot name="icon" />
      </span>
    </div>
    <div class="text-center">
      <div class="text-sm font-bold text-gray-800">{{ label }}</div>
      <div v-if="sub" class="text-xs text-gray-400 mt-0.5">{{ sub }}</div>
    </div>
  </button>
</template>
