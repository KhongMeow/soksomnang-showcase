<script setup lang="ts">
const props = defineProps<{
  data: number[] | Record<string, number>
  labels?: string[]
  colors?: string[]
}>()

const chartColors = computed(() => props.colors || ['#16a34a', '#ea580c', '#dc2626'])
const chartLabels = computed(() => props.labels || ['បង់រួច (Paid)', 'បង់ខ្លះ (Partial)', 'ជំពាក់ (Credit)'])
const chartValues = computed(() => {
  if (Array.isArray(props.data)) return props.data
  return Object.values(props.data || {})
})
const total = computed(() => chartValues.value.reduce((a, b) => a + b, 0) || 1)
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-4 py-2">
    <div class="relative w-48 h-48 flex items-center justify-center">
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" stroke-width="3.8" />
        <circle
          v-for="(val, idx) in chartValues"
          :key="idx"
          cx="18" cy="18" r="15.9155"
          fill="none"
          :stroke="chartColors[idx % chartColors.length]"
          stroke-width="3.8"
          :stroke-dasharray="`${(val / total) * 100} ${100 - (val / total) * 100}`"
          :stroke-dashoffset="-chartValues.slice(0, idx).reduce((a, b) => a + (b / total) * 100, 0)"
          class="transition-all duration-500"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span class="text-2xl font-bold text-[#0f2a4a]">{{ total.toLocaleString() }}</span>
        <span class="text-xs text-gray-500 font-semibold">សរុប</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-gray-600">
      <div v-for="(val, idx) in chartValues" :key="idx" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: chartColors[idx % chartColors.length] }" />
        <span>{{ chartLabels[idx] || `Item ${idx+1}` }}: {{ val }}</span>
      </div>
    </div>
  </div>
</template>
