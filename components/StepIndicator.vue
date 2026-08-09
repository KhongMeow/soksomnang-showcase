<script setup lang="ts">
defineProps<{ step: number; steps: string[] }>()
</script>

<template>
  <div class="flex items-center gap-0 w-full max-w-xs mx-auto mb-6">
    <div v-for="(label, i) in steps" :key="i" class="flex items-center flex-1">
      <div class="flex flex-col items-center flex-shrink-0">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
          :class="[
            i + 1 < step
              ? 'bg-[#16a34a] text-white'
              : i + 1 === step
                ? 'bg-[#0f2a4a] text-white ring-4 ring-[#0f2a4a]/20'
                : 'bg-gray-200 text-gray-400',
          ]"
        >
          <IconCheck v-if="i + 1 < step" />
          <span v-else>{{ i + 1 }}</span>
        </div>
        <span
          class="text-xs mt-1 font-medium whitespace-nowrap"
          :class="i + 1 === step ? 'text-[#0f2a4a]' : i + 1 < step ? 'text-[#16a34a]' : 'text-gray-400'"
        >
          {{ label }}
        </span>
      </div>
      <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-1 rounded" :class="i + 1 < step ? 'bg-[#16a34a]' : 'bg-gray-200'" />
    </div>
  </div>
</template>
