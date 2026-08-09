<script setup lang="ts">
import type { Unit } from "~/utils/data"

const props = defineProps<{ value: Unit; showKg?: boolean }>()
const emit = defineEmits<{ (e: "change", value: Unit): void }>()

const unitConfig: Record<Unit, { label: string; sub: string; icon: string }> = {
  taka: { label: "តាការ", sub: "ក្នុង​មួយ​ក្រុម", icon: "🐓" },
  head: { label: "ក្បាល", sub: "ក្នុង​មួយ​ក្បាល", icon: "🐔" },
  kg: { label: "គីឡូក្រាម", sub: "ក្នុង​មួយ​គីឡូ", icon: "⚖️" },
}

const units = computed<Unit[]>(() => (props.showKg === false ? ["taka", "head"] : ["taka", "head", "kg"]))
</script>

<template>
  <div class="grid gap-3" :class="units.length === 2 ? 'grid-cols-2' : 'grid-cols-3'">
    <button
      v-for="u in units"
      :key="u"
      type="button"
      @click="emit('change', u)"
      class="flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all font-medium select-none"
      :class="
        value === u
          ? 'border-[#00b4c8] bg-[#e0f9fb] text-[#0f2a4a] shadow-md'
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
      "
    >
      <span class="text-2xl mb-1">{{ unitConfig[u].icon }}</span>
      <span class="text-base font-bold">{{ unitConfig[u].label }}</span>
      <span class="text-[10px] mt-0.5 text-gray-400">{{ unitConfig[u].sub }}</span>
    </button>
  </div>
</template>
