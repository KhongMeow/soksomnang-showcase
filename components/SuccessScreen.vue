<script setup lang="ts">
import type { PayStatus } from "~/utils/data"

defineProps<{
  title: string
  invoiceNo: string
  rows: { label: string; value: string }[]
  status?: PayStatus
  onPrint?: () => void
  newLabel?: string
}>()

const emit = defineEmits<{
  (e: "new"): void
  (e: "view"): void
}>()
</script>

<template>
  <div class="min-h-dvh bg-[#f0f4f8] flex items-center justify-center px-4 py-8 -mx-4 -mt-5 -mb-24 lg:-mx-8 lg:-mt-6 lg:-mb-8">
    <div class="w-full max-w-sm">
      <div class="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div class="bg-gradient-to-br from-[#15803d] to-[#16a34a] px-6 py-8 text-white text-center">
          <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-8 h-8">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-1">{{ title }}</h2>
          <p class="text-green-200 text-sm font-mono">{{ invoiceNo }}</p>
        </div>
        <div class="p-6 space-y-3">
          <div v-for="(r, i) in rows" :key="i" class="flex justify-between items-center py-1">
            <span class="text-sm text-gray-500">{{ r.label }}</span>
            <span class="text-sm font-semibold text-gray-800">{{ r.value }}</span>
          </div>
          <div v-if="status" class="pt-2 border-t border-gray-100">
            <StatusBadge :status="status" size="md" />
          </div>
        </div>
        <div class="px-6 pb-6 flex flex-col gap-3">
          <button v-if="onPrint" @click="onPrint" class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <IconPrint /> បោះពុម្ព
          </button>
          <button @click="emit('new')" class="w-full py-3.5 rounded-xl bg-[#00b4c8] text-white font-bold hover:bg-[#0097a7] transition-colors">
            {{ newLabel ?? "បង្កើតថ្មី" }}
          </button>
          <button @click="emit('view')" class="w-full py-3.5 rounded-xl bg-[#0f2a4a] text-white font-bold hover:bg-[#1a4a7a] transition-colors">
            មើលប្រតិបត្តិការ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
