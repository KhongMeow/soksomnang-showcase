<script setup lang="ts">
import type { PropType } from "vue"

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: "បង់រួច", bg: "bg-[#dcfce7]", text: "text-[#15803d]" },
  partial: { label: "បង់ខ្លះ", bg: "bg-[#fff7ed]", text: "text-[#c2410c]" },
  credit: { label: "ជំពាក់", bg: "bg-[#fef2f2]", text: "text-[#b91c1c]" },
  received: { label: "បានទទួល", bg: "bg-[#dcfce7]", text: "text-[#15803d]" },
  cancelled: { label: "បានបោះបង់", bg: "bg-[#f1f5f9]", text: "text-[#64748b]" },
  pending: { label: "កំពុងរង់ចាំ", bg: "bg-[#fef9c3]", text: "text-[#854d0e]" },
  approved: { label: "បានយល់ព្រម", bg: "bg-[#dcfce7]", text: "text-[#15803d]" },
  rejected: { label: "បានបដិសេធ", bg: "bg-[#f1f5f9]", text: "text-[#64748b]" },
}

const props = defineProps({
  status: { type: String, required: true },
  size: { type: String as PropType<"sm" | "md">, default: "sm" },
})

const cfg = computed(() => statusConfig[props.status] ?? { label: props.status, bg: "bg-gray-100", text: "text-gray-600" })
const px = computed(() => (props.size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"))
</script>

<template>
  <span class="inline-flex items-center font-semibold rounded-full" :class="[px, cfg.bg, cfg.text]">
    {{ cfg.label }}
  </span>
</template>
