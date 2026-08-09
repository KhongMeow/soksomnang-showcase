<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
  color?: string
}>()

const colorMap: Record<string, string> = {
  navy: "from-[#0f2a4a] to-[#1a4a7a]",
  cyan: "from-[#0097a7] to-[#00b4c8]",
  green: "from-[#15803d] to-[#16a34a]",
  orange: "from-[#c2410c] to-[#ea580c]",
  red: "from-[#b91c1c] to-[#dc2626]",
  purple: "from-[#6d28d9] to-[#7c3aed]",
}
</script>

<template>
  <div class="rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm" :class="colorMap[color ?? 'navy'] ?? colorMap.navy">
    <div class="flex items-start justify-between mb-3">
      <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
        <slot name="icon" />
      </div>
    </div>
    <div class="text-2xl font-bold tracking-tight">{{ value }}</div>
    <div class="text-xs font-medium text-white/70 mt-1">{{ label }}</div>
    <div v-if="sub" class="text-xs text-white/50 mt-0.5">{{ sub }}</div>
  </div>
</template>
