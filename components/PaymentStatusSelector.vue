<script setup lang="ts">
import type { PayStatus } from "~/utils/data"

defineProps<{ value: PayStatus }>()
const emit = defineEmits<{ (e: "change", v: PayStatus): void }>()

const payStatuses: { value: PayStatus; label: string; color: string; border: string }[] = [
  { value: "paid", label: "បង់រួច", color: "bg-[#dcfce7] text-[#15803d]", border: "border-[#86efac]" },
  { value: "partial", label: "បង់ខ្លះ", color: "bg-[#fff7ed] text-[#c2410c]", border: "border-[#fdba74]" },
  { value: "credit", label: "ជំពាក់", color: "bg-[#fef2f2] text-[#b91c1c]", border: "border-[#fca5a5]" },
]
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <button
      v-for="s in payStatuses"
      :key="s.value"
      type="button"
      @click="emit('change', s.value)"
      class="py-3.5 rounded-xl border-2 font-bold text-sm transition-all"
      :class="
        value === s.value
          ? `${s.color} ${s.border} shadow-md`
          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
      "
    >
      {{ s.label }}
    </button>
  </div>
</template>
