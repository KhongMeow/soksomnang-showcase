<script setup lang="ts">
definePageMeta({ middleware: ["auth", "admin"] })

const router = useRouter()
const api = useApi()

const summary = ref({ todayRevenue: 0, todayExpense: 0 })

onMounted(async () => {
  try {
    const s = await api.get<any>("/dashboard/summary")
    summary.value = { todayRevenue: s.todayRevenue ?? 0, todayExpense: s.todayExpense ?? 0 }
  } catch (e) {
    console.error(e)
  }
})

const REPORT_CATEGORIES = [
  { id: "sale", label: "របាយការណ៍លក់", icon: resolveComponent("IconSale"), color: "#16a34a", desc: "Sales Report" },
  { id: "purchase", label: "របាយការណ៍ទិញ", icon: resolveComponent("IconPurchase"), color: "#1a4a7a", desc: "Purchase Report" },
  { id: "stock", label: "របាយការណ៍ស្តុក", icon: resolveComponent("IconStock"), color: "#7c3aed", desc: "Stock Report" },
  { id: "transfer", label: "របាយការណ៍ផ្ទេរ", icon: resolveComponent("IconTransfer"), color: "#0097a7", desc: "Transfer Report" },
  { id: "client-debt", label: "ជំពាក់ Client", icon: resolveComponent("IconDebt"), color: "#dc2626", desc: "Client Debt" },
  { id: "supplier-debt", label: "ជំពាក់ Supplier", icon: resolveComponent("IconDebt"), color: "#ea580c", desc: "Supplier Debt" },
  { id: "income", label: "របាយការណ៍ចំណូល", icon: resolveComponent("IconReport"), color: "#16a34a", desc: "Income Report" },
  { id: "expense", label: "របាយការណ៍ចំណាយ", icon: resolveComponent("IconExpense"), color: "#ea580c", desc: "Expense Report" },
  { id: "profit", label: "របាយការណ៍ចំណេញ", icon: resolveComponent("IconReport"), color: "#15803d", desc: "Profit Report" },
  { id: "cashbank", label: "Cash & Bank", icon: resolveComponent("IconReport"), color: "#0f2a4a", desc: "Cash/Bank Report" },
  { id: "closing", label: "បិទបញ្ជីប្រចាំខែ", icon: resolveComponent("IconReport"), color: "#6d28d9", desc: "Monthly Closing" },
  { id: "audit", label: "Audit History", icon: resolveComponent("IconReport"), color: "#374151", desc: "Audit Log" },
]
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="មជ្ឈមណ្ឌលរបាយការណ៍" :onBack="() => router.push('/dashboard')" />

    <div class="grid grid-cols-2 gap-3 mb-6">
      <Card class="bg-gradient-to-br from-[#0f2a4a] to-[#1a4a7a] text-white border-0 p-4">
        <div class="text-2xl font-bold">${{ summary.todayRevenue.toLocaleString() }}</div>
        <div class="text-xs text-white/60 mt-1">ការលក់ថ្ងៃនេះ</div>
      </Card>
      <Card class="bg-gradient-to-br from-[#15803d] to-[#16a34a] text-white border-0 p-4">
        <div class="text-2xl font-bold">${{ Math.max(0, summary.todayRevenue - summary.todayExpense).toLocaleString() }}</div>
        <div class="text-xs text-white/60 mt-1">ចំណូលសុទ្ធ</div>
      </Card>
    </div>

    <div class="mb-4">
      <h2 class="text-base font-bold text-gray-700 mb-3">ជ្រើសរើសប្រភេទរបាយការណ៍</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NuxtLink
          v-for="r in REPORT_CATEGORIES"
          :key="r.id"
          :to="`/reports/${r.id}`"
          class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-[#00b4c8] hover:shadow-md transition-all text-left group no-underline"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            :style="{ backgroundColor: r.color + '15', color: r.color }"
          >
            <component :is="r.icon" />
          </div>
          <div>
            <div class="text-sm font-bold text-gray-800 leading-tight">{{ r.label }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ r.desc }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
