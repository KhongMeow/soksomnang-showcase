<script setup lang="ts">
const props = defineProps<{
  data: Array<{ date: string; income: number; expense: number }>
}>()
</script>

<template>
  <div class="space-y-4 pt-4">
    <div class="h-56 flex items-end justify-between gap-4 px-2 border-b border-gray-100">
      <div v-for="(d, i) in data" :key="i" class="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
        <div class="w-full flex items-end justify-center gap-2 h-full relative">
          <div
            class="w-6 bg-emerald-500 rounded-t-md transition-all duration-500 group-hover:bg-emerald-400 relative shadow-sm"
            :style="{ height: `${Math.min(100, Math.max(10, ((d.income || 0) / 1600) * 100))}%` }"
          >
            <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
              ${{ d.income }}
            </div>
          </div>
          <div
            class="w-6 bg-orange-500 rounded-t-md transition-all duration-500 relative shadow-sm"
            :style="{ height: `${Math.min(100, Math.max(8, ((d.expense || 0) / 1600) * 100))}%` }"
          >
            <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
              ${{ d.expense }}
            </div>
          </div>
        </div>
        <span class="text-xs font-semibold text-gray-600 truncate">{{ d.date }}</span>
      </div>
    </div>
    <div class="flex items-center justify-center gap-6 text-xs font-semibold text-gray-600">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm bg-emerald-500" />
        <span>ចំណូល (Income)</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm bg-orange-500" />
        <span>ចំណាយ (Expense)</span>
      </div>
    </div>
  </div>
</template>
