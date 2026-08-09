<script setup lang="ts">
defineProps<{ branch: string; heads: number; kg: number; warning?: boolean }>()
</script>

<template>
  <div class="rounded-xl p-4 border-2" :class="warning ? 'bg-[#fff7ed] border-[#fed7aa]' : 'bg-[#e0f9fb] border-[#a5f3fc]'">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-semibold text-gray-600">ស្តុកបច្ចុប្បន្ន · {{ branch }}</span>
      <span v-if="warning" class="text-xs font-bold text-[#ea580c] flex items-center gap-1"><IconWarning /> ស្តុកស្ទើរអស់</span>
    </div>
    <div class="flex gap-6">
      <div>
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ heads.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-0.5">ក្បាល</div>
      </div>
      <div class="w-px bg-gray-200" />
      <div>
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ kg.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-0.5">គីឡូក្រាម</div>
      </div>
    </div>
  </div>
</template>
