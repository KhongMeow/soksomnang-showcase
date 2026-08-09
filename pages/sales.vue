<script setup lang="ts">
import type { Sale } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()

const { items: sales, loading, hasMore } = useInfiniteList<Sale>(
  (offset, limit) => api.get<Sale[]>("/sales", { limit, offset }),
  20,
)

const totalRevenue = computed(() => sales.value.reduce((a, s) => a + s.total, 0))
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="ប្រវត្តិលក់" :onBack="() => router.push('/dashboard')" />

    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="bg-gradient-to-br from-[#0f2a4a] to-[#1a4a7a] rounded-2xl p-4 text-white">
        <div class="text-2xl font-bold">{{ sales.length }}</div>
        <div class="text-xs text-white/70 mt-1">ប្រតិបត្តិការលក់</div>
      </div>
      <div class="bg-gradient-to-br from-[#15803d] to-[#16a34a] rounded-2xl p-4 text-white">
        <div class="text-2xl font-bold">${{ totalRevenue.toLocaleString() }}</div>
        <div class="text-xs text-white/70 mt-1">ចំណូលសរុប</div>
      </div>
    </div>

    <div v-if="sales.length === 0 && !loading" class="bg-white rounded-2xl border border-gray-100">
      <div class="text-center py-10">
        <div class="text-4xl mb-3">🛒</div>
        <p class="font-bold text-gray-600">គ្មានការលក់</p>
        <p class="text-sm text-gray-400 mt-1">បង្កើតការលក់ដំបូងដើម្បីមើលប្រវត្តិ</p>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="s in sales" :key="s.id" class="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-xs font-bold text-gray-700">{{ s.invoiceNo }}</span>
            <StatusBadge :status="s.status" />
          </div>
          <div class="text-sm font-semibold text-gray-800 mt-1">{{ s.product }} · {{ s.qty }} {{ s.unit }}</div>
          <div class="text-xs text-gray-400">{{ s.client }} · {{ s.date }}</div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="font-bold text-gray-800">${{ s.total.toFixed(2) }}</div>
          <div class="text-xs text-gray-400">ដោយ {{ s.staff || '—' }}</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-6 text-gray-400 text-sm">
      <div class="inline-block w-5 h-5 border-2 border-[#00b4c8] border-t-transparent rounded-full animate-spin" />
    </div>
    <p v-if="!hasMore && sales.length > 0" class="text-center py-6 text-xs text-gray-400">
      បានបង្ហាញទាំងអស់ ({{ sales.length }})
    </p>
  </div>
</template>
