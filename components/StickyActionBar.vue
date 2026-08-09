<script setup lang="ts">
defineProps<{
  total: string
  totalLabel?: string
  saveLabel?: string
  disabled?: boolean
  onBack?: () => void
}>()

const emit = defineEmits<{ (e: "save"): void }>()
</script>

<template>
  <div class="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 shadow-2xl px-4 py-4 z-30">
    <div class="flex items-center gap-3 max-w-2xl mx-auto">
      <button
        v-if="onBack"
        type="button"
        @click="onBack"
        class="flex items-center gap-2 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
      >
        <IconBack />
        <span class="hidden sm:inline">ថយក្រោយ</span>
      </button>
      <div class="flex-1 bg-[#0f2a4a] rounded-xl px-4 py-2 text-center">
        <div class="text-xs text-[#00b4c8] font-medium">{{ totalLabel ?? "តម្លៃសរុប" }}</div>
        <div class="text-xl font-bold text-white">{{ total }}</div>
      </div>
      <button
        type="button"
        @click="emit('save')"
        :disabled="disabled"
        class="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-base transition-all"
        :class="disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#00b4c8] hover:bg-[#0097a7] active:scale-[0.98] shadow-lg'"
      >
        <IconCheck />
        {{ saveLabel ?? "បញ្ជាក់" }}
      </button>
    </div>
  </div>
</template>
