<script setup lang="ts">
defineProps<{
  isOpen: boolean
  value: string
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "update:value", v: string): void
}>()
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
    <div class="relative bg-[#f0f4f8] w-full max-w-sm rounded-t-3xl lg:rounded-3xl p-5 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-bold text-[#0f2a4a]">{{ label ?? "បញ្ចូលចំនួន" }}</h3>
        <button @click="emit('close')" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300">
          <IconClose />
        </button>
      </div>
      <NumericKeypad :value="value" @update:value="emit('update:value', $event)" @done="emit('close')" :hint="hint" />
    </div>
  </div>
</template>
