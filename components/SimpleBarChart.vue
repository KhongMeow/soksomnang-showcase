<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    data: Array<{ branch?: string; date?: string; sales: number; paid?: number; credit?: number; expense?: number }>
    height?: number
  }>(),
  { height: 260 }
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between gap-4 pt-6 px-2 border-b border-gray-100" :style="{ height: `${height}px` }">
      <div
        v-for="(item, idx) in data"
        :key="idx"
        class="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
      >
        <div class="w-full max-w-[64px] flex items-end justify-center gap-2 h-full relative">
          <!-- Primary Bar (Sales) -->
          <div
            class="w-5 bg-[#0f2a4a] rounded-t-lg transition-all duration-500 group-hover:bg-[#00b4c8] relative shadow-sm"
            :style="{ height: `${Math.min(100, Math.max(12, ((item.sales || 0) / 1600) * 100))}%` }"
          >
            <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
              ${{ item.sales?.toLocaleString() }}
            </div>
          </div>

          <!-- Secondary Bar (Paid or Expense) -->
          <div
            v-if="item.paid !== undefined || item.expense !== undefined"
            class="w-5 bg-emerald-600 rounded-t-lg transition-all duration-500 relative shadow-sm"
            :style="{ height: `${Math.min(100, Math.max(10, (((item.paid ?? item.expense) || 0) / 1600) * 100))}%` }"
          />

          <!-- Credit Bar (if exists) -->
          <div
            v-if="item.credit"
            class="w-4 bg-red-500 rounded-t-lg transition-all duration-500 relative shadow-sm"
            :style="{ height: `${Math.min(100, Math.max(8, ((item.credit || 0) / 1600) * 100))}%` }"
          />
        </div>
        <span class="text-xs font-semibold text-gray-600 truncate max-w-[90px] text-center">
          {{ item.branch || item.date }}
        </span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center gap-6 text-xs font-semibold text-gray-600 pt-1">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm bg-[#0f2a4a]" />
        <span>ចំណូល (Sales)</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm bg-emerald-600" />
        <span>បង់រួច / ចំណាយ</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm bg-red-500" />
        <span>ជំពាក់ (Credit)</span>
      </div>
    </div>
  </div>
</template>
