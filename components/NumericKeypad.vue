<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue"

const props = defineProps<{
  value: string
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: "update:value", v: string): void
  (e: "done"): void
}>()

const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"]

function press(k: string) {
  const v = props.value
  if (k === "⌫") {
    emit("update:value", v.slice(0, -1))
  } else if (k === ".") {
    if (!v.includes(".")) emit("update:value", v + ".")
  } else {
    if (v === "0") emit("update:value", k)
    else emit("update:value", v + k)
  }
}

const keyInput = ref<HTMLInputElement | null>(null)

function onKeydown(e: KeyboardEvent) {
  const k = e.key
  if (k === "Enter") {
    e.preventDefault()
    emit("done")
  } else if (k === "Escape") {
    e.preventDefault()
    emit("done")
  } else if (k === "Backspace") {
    e.preventDefault()
    press("⌫")
  } else if (/^[0-9.]$/.test(k)) {
    e.preventDefault()
    press(k)
  }
}

onMounted(() => {
  keyInput.value?.focus()
  window.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <div class="flex flex-col">
    <input
      ref="keyInput"
      class="sr-only"
      tabindex="-1"
      inputmode="decimal"
      aria-hidden="true"
    />
    <div v-if="label" class="text-center mb-2">
      <div class="text-sm font-semibold text-gray-500 uppercase tracking-wide">{{ label }}</div>
    </div>
    <div class="bg-[#0f2a4a] rounded-2xl px-4 py-3 mb-3">
      <div class="text-right text-3xl font-bold text-white tracking-wider min-h-[44px]">
        {{ value || "0" }}
      </div>
      <div v-if="hint" class="text-right text-xs text-[#00b4c8] mt-1">{{ hint }}</div>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="k in keys"
        :key="k"
        type="button"
        @pointerdown.prevent="press(k)"
        class="h-14 rounded-xl text-xl font-bold transition-all active:scale-95 select-none"
        :class="
          k === '⌫'
            ? 'bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2]'
            : 'bg-white text-[#0f2a4a] hover:bg-[#e0f9fb] shadow-sm border border-gray-100'
        "
      >
        {{ k }}
      </button>
    </div>
    <button
      type="button"
      @click="emit('done')"
      class="mt-3 w-full h-14 bg-[#00b4c8] hover:bg-[#0097a7] text-white text-lg font-bold rounded-xl transition-colors active:scale-[0.98]"
    >
      បញ្ជាក់
    </button>
  </div>
</template>
