<script setup lang="ts">
import type { PurchaseRequest } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()

const { items: requests, loading, hasMore } = useInfiniteList<PurchaseRequest>(
  (offset, limit) => api.get<PurchaseRequest[]>("/purchase-requests", { limit, offset }),
  20,
)
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <PageHeader title="ស្នើសុំស្តុករបស់ខ្ញុំ" :onBack="() => router.push('/dashboard')" />

    <div v-if="requests.length === 0 && !loading" class="bg-white rounded-2xl border border-gray-100">
      <div class="text-center py-10">
        <div class="text-4xl mb-3">📦</div>
        <p class="font-bold text-gray-600">គ្មានសំណើស្តុក</p>
        <p class="text-sm text-gray-400 mt-1">ចុច "ស្នើសុំស្តុក" ដើម្បីផ្ញើសំណើទៅ Admin</p>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="r in requests" :key="r.id" class="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-xs font-bold text-gray-700">{{ r.requestNo }}</span>
            <StatusBadge :status="r.status" />
          </div>
          <div class="text-sm font-semibold text-gray-800 mt-1">{{ r.productName }} · {{ r.heads }} ក្បាល · {{ r.kg }} គីឡូ</div>
          <div class="text-xs text-gray-400">{{ r.date }} · {{ r.sourceBranchName }} → {{ r.branchName }}</div>
        </div>
        <div class="text-right text-xs text-gray-400 flex-shrink-0">
          <div v-if="r.decidedBy" class="font-semibold text-gray-600">{{ r.decidedBy }}</div>
          <div>{{ r.decidedAt ?? r.createdByName }}</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-6 text-gray-400 text-sm">
      <div class="inline-block w-5 h-5 border-2 border-[#00b4c8] border-t-transparent rounded-full animate-spin" />
    </div>
    <p v-if="!hasMore && requests.length > 0" class="text-center py-6 text-xs text-gray-400">
      បានបង្ហាញទាំងអស់ ({{ requests.length }})
    </p>
  </div>
</template>
