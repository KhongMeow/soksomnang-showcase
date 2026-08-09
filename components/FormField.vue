<script setup lang="ts">
import { isTouchDevice } from "~/composables/useTouch"

const props = defineProps<{
  label: string
  value: string
  placeholder?: string
  type?: string
  readOnly?: boolean
  hint?: string
  required?: boolean
}>()

const emit = defineEmits<{
  (e: "update:value", v: string): void
  (e: "numpadOpen"): void
}>()

const isTouch = isTouchDevice()
</script>

<template>
  <div>
    <label class="block text-sm font-semibold text-gray-700 mb-1.5">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :type="type ?? 'text'"
        :value="value"
        inputmode="decimal"
        @input="emit('update:value', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :readonly="readOnly || isTouch"
        @click="emit('numpadOpen')"
        class="w-full px-4 py-3.5 rounded-xl border-2 text-base transition-colors outline-none"
        :class="{
          'bg-gray-50 border-gray-100 text-gray-500': readOnly,
          'bg-white border-gray-200 cursor-pointer focus:border-[#00b4c8] hover:border-gray-300 pr-12': !readOnly,
          'bg-white border-gray-200 focus:border-[#00b4c8]': readOnly,
        }"
      />
      <button
        v-if="!readOnly"
        type="button"
        @click.stop="emit('numpadOpen')"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-[#00b4c8] p-1"
        :aria-label="'Open keypad for ' + label"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 pointer-events-none">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    <p v-if="hint" class="text-xs text-gray-400 mt-1">{{ hint }}</p>
  </div>
</template>
