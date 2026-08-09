<script setup lang="ts">
import type { Role, Branch, Product, Client, Supplier, Sale, Purchase, StockTransfer, Expense } from "~/utils/data"
import { BarChart, DonutChart, AreaChart, DonutType, LegendPosition } from "vue-chrts"

definePageMeta({ middleware: "auth" })

const { role, user, has } = useAuth()
const router = useRouter()
const api = useApi()

const fabOpen = ref(false)
const branch = ref("central")
const viewMode = ref<"normal" | "advanced">("normal")
const loading = ref(true)

const branches = ref<Branch[]>([])
const products = ref<Product[]>([])
const clients = ref<Client[]>([])
const suppliers = ref<Supplier[]>([])
const summary = ref({
  date: new Date().toISOString().slice(0, 10),
  todaySales: 0,
  todayRevenue: 0,
  todayExpense: 0,
  totalDebt: 0,
  totalSupplierDebt: 0,
  productCount: 0,
  totalHeads: 0,
  totalKg: 0,
  lowStock: 0,
})
const recent = ref<{ sales: Sale[]; purchases: Purchase[]; transfers: StockTransfer[]; expenses: Expense[] }>({
  sales: [],
  purchases: [],
  transfers: [],
  expenses: [],
})
const advanced = ref<any>({
  salesByBranch: [],
  salesByDay: [],
  paymentStatusCounts: { paid: 0, partial: 0, credit: 0 },
  cashBank: { cash: 0, bank: 0 },
  stockByBranch: [],
  topDebtors: [],
})

onMounted(async () => {
  try {
    const [b, p, c, s, sum, rec, adv] = await Promise.all([
      api.get<Branch[]>("/branches"),
      api.get<Product[]>("/products"),
      api.get<Client[]>("/clients"),
      api.get<Supplier[]>("/suppliers"),
      api.get<any>("/dashboard/summary"),
      api.get<any>("/dashboard/recent"),
      api.get<any>("/dashboard/advanced"),
    ])
    branches.value = b
    products.value = p
    clients.value = c
    suppliers.value = s
    summary.value = { ...summary.value, ...sum }
    recent.value = rec
    advanced.value = adv
    if (user.value?.branchId) branch.value = user.value.branchId
    else if (b.length) branch.value = b[0].id
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const currentBranch = computed(() => branches.value.find((b) => b.id === branch.value))

const todaySalesCount = computed(() => summary.value.todaySales)
const todayRevenue = computed(() => summary.value.todayRevenue)
const todayExpense = computed(() => summary.value.todayExpense)
const totalDebt = computed(() => summary.value.totalDebt)
const totalSupplierDebt = computed(() => summary.value.totalSupplierDebt)

const recentSales = computed(() => recent.value.sales)
const recentPurchases = computed(() => recent.value.purchases)
const recentTransfers = computed(() => recent.value.transfers)

const stockForBranch = computed(() =>
  products.value.map((p) => ({
    name: p.name,
    ...(p.stock?.[branch.value] ?? { heads: 0, kg: 0 }),
  })),
)
const totalHeads = computed(() => stockForBranch.value.reduce((a, s) => a + s.heads, 0))
const totalKg = computed(() => stockForBranch.value.reduce((a, s) => a + s.kg, 0))
const lowStockProducts = computed(() => stockForBranch.value.filter((s) => s.heads < 150))

const quickActions = [
  { id: "purchase", label: "ទិញចូល", sub: "Purchase", icon: resolveComponent("IconPurchase"), screen: "new-purchase", color: "#1a4a7a", admin: true },
  { id: "request", label: "ស្នើសុំស្តុក", sub: "Request", icon: resolveComponent("IconPurchase"), screen: "new-purchase", color: "#0d9488", staff: true },
  { id: "sale", label: "លក់ថ្មី", sub: "New Sale", icon: resolveComponent("IconSale"), screen: "new-sale", color: "#16a34a", perm: "create_sale" },
  { id: "transfer", label: "ផ្ទេរស្តុក", sub: "Transfer", icon: resolveComponent("IconTransfer"), screen: "stock-transfer", color: "#7c3aed", admin: true },
  { id: "transferStaff", label: "ផ្ទេរស្តុក", sub: "Transfer", icon: resolveComponent("IconTransfer"), screen: "stock-transfer", color: "#7c3aed", staff: true },
  { id: "payment", label: "ទទួលលុយ", sub: "Payment", icon: resolveComponent("IconDebt"), screen: "client-payment", color: "#0097a7", perm: "receive_payment" },
  { id: "expense", label: "ចំណាយ", sub: "Expense", icon: resolveComponent("IconExpense"), screen: "expense", color: "#ea580c", admin: true },
  { id: "reports", label: "របាយការណ៍", sub: "Reports", icon: resolveComponent("IconReport"), screen: "reports", color: "#dc2626", admin: true },
]

const visibleQuickActions = computed(() => {
  if (role.value === "admin") return quickActions.filter((q) => !q.staff)
  return quickActions.filter((q) => q.staff || (q.perm && has(q.perm)))
})

const fabActions = [
  { label: "លក់ថ្មី", icon: resolveComponent("IconSale"), screen: "new-sale", perm: "create_sale" },
  { label: "ទិញចូលថ្មី", icon: resolveComponent("IconPurchase"), screen: "new-purchase" },
  { label: "ផ្ទេរស្តុក", icon: resolveComponent("IconTransfer"), screen: "stock-transfer" },
  { label: "ទទួលលុយម៉ូយ", icon: resolveComponent("IconDebt"), screen: "client-payment", perm: "receive_payment" },
  { label: "ទូទាត់ Supplier", icon: resolveComponent("IconSupplier"), screen: "supplier-payment" },
  { label: "កែសម្រួលស្តុក", icon: resolveComponent("IconStock"), screen: "stock-adjustment" },
  { label: "បញ្ចូលចំណាយ", icon: resolveComponent("IconExpense"), screen: "expense" },
]

const visibleFabActions = computed(() =>
  role.value === "admin"
    ? fabActions
    : fabActions.filter((a) => a.perm && has(a.perm)),
)

function navigate(s: string) {
  router.push(`/${s}`)
}

// ─── Advanced view chart data ────────────────────────────────────────────────

const salesByBranchData = computed(() => advanced.value.salesByBranch ?? [])
const salesByDayData = computed(() => advanced.value.salesByDay ?? [])
const paymentStatusData = computed(() => {
  const c = advanced.value.paymentStatusCounts ?? { paid: 0, partial: 0, credit: 0 }
  return [c.paid, c.partial, c.credit]
})
const cashBankData = computed(() => {
  const c = advanced.value.cashBank ?? { cash: 0, bank: 0 }
  return [c.cash, c.bank]
})
const cashValue = computed(() => advanced.value.cashBank?.cash ?? 0)
const bankValue = computed(() => advanced.value.cashBank?.bank ?? 0)
const totalCashBank = computed(() => cashValue.value + bankValue.value)
const stockByBranchData = computed(() => advanced.value.stockByBranch ?? [])
const incomeVsExpenseData = computed(() =>
  (advanced.value.salesByDay ?? []).map((d: any) => ({
    date: new Date(`${d.date}T00:00:00`).toLocaleDateString("en", { weekday: "short" }),
    income: d.sales,
    expense: d.expense ?? 0,
  })),
)

const payStatusCategories = {
  paid: { name: "បង់រួច", color: "#16a34a" },
  partial: { name: "បង់ខ្លះ", color: "#ea580c" },
  credit: { name: "ជំពាក់", color: "#dc2626" },
}

const cashBankCategories = {
  cash: { name: "Cash", color: "#16a34a" },
  bank: { name: "Bank", color: "#0097a7" },
}

const incomeExpenseCategories = {
  income: { name: "ចំណូល", color: "#16a34a" },
  expense: { name: "ចំណាយ", color: "#ea580c" },
}

const allStocks = computed(() =>
  products.value.map((p) => {
    const entries = Object.values(p.stock ?? {})
    return {
      name: p.name,
      heads: entries.reduce((a, s) => a + (s?.heads ?? 0), 0),
      kg: entries.reduce((a, s) => a + (s?.kg ?? 0), 0),
      low: entries.some((s) => (s?.heads ?? 0) < 150),
    }
  }),
)
const totalAllHeads = computed(() => allStocks.value.reduce((a, s) => a + s.heads, 0))
const todayLabel = computed(() => summary.value.date)
</script>

<template>
  <div class="relative">
    <!-- Header with view toggle -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div class="min-w-0">
        <h1 class="text-lg sm:text-xl font-bold text-[#0f2a4a]">
          {{ role === "admin" ? "ផ្ទាំងគ្រប់គ្រង" : "ទំព័រដើម" }}
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">ថ្ងៃទី {{ todayLabel }}</p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
        <div v-if="role === 'admin'" class="w-full sm:w-52 min-w-0">
          <SearchDropdown
            size="sm"
            :options="branches.map(b => ({ id: b.id, label: b.name }))"
            :value="branch"
            placeholder="ជ្រើសរើសសាខា..."
            @change="(id, label) => branch = id"
          />
        </div>
        <div class="flex rounded-xl bg-gray-100 p-1 ml-auto sm:ml-0">
          <button
            @click="viewMode = 'normal'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            :class="viewMode === 'normal' ? 'bg-white text-[#0f2a4a] shadow-sm' : 'text-gray-500'"
          >ធម្មតា</button>
          <button
            @click="viewMode = 'advanced'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            :class="viewMode === 'advanced' ? 'bg-white text-[#0f2a4a] shadow-sm' : 'text-gray-500'"
          >ទំនើប</button>
        </div>
        <div class="w-9 h-9 rounded-xl bg-[#0f2a4a] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {{ role === "admin" ? "A" : "S" }}
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- NORMAL VIEW -->
    <!-- ============================================================ -->
    <div v-if="viewMode === 'normal'">
      <!-- Quick Actions -->
      <div class="mb-6">
        <h2 class="text-base font-bold text-gray-700 mb-3">ប្រតិបត្តិការលឿន</h2>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <template v-for="q in visibleQuickActions" :key="q.id">
            <QuickActionCard
              :label="q.label" :sub="q.sub" :color="q.color" @click="navigate(q.screen)">
              <template #icon><component :is="q.icon" /></template>
            </QuickActionCard>
          </template>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPICard label="ការលក់ថ្ងៃនេះ" :value="`${todaySalesCount} ប្រតិ`" sub="Today Sales" color="navy">
          <template #icon><IconSale /></template>
        </KPICard>
        <KPICard label="ចំណូលថ្ងៃនេះ" :value="`$${todayRevenue.toLocaleString()}`" sub="Revenue" color="green">
          <template #icon><IconReport /></template>
        </KPICard>
        <KPICard label="ចំណាយថ្ងៃនេះ" :value="`$${todayExpense}`" sub="Expense" color="orange">
          <template #icon><IconExpense /></template>
        </KPICard>
        <KPICard label="ជំពាក់សរុប" :value="`$${totalDebt.toLocaleString()}`" sub="Client Debt" color="red">
          <template #icon><IconDebt /></template>
        </KPICard>
      </div>

      <!-- Stock Summary -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-bold text-gray-700">ស្តុកបច្ចុប្បន្ន · {{ currentBranch?.name }}</h2>
          <button @click="navigate('stock')" class="text-sm text-[#00b4c8] font-semibold hover:underline">មើលទាំងអស់</button>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <Card class="text-center py-4"><div class="text-2xl font-bold text-[#0f2a4a]">{{ products.length }}</div><div class="text-xs text-gray-500 mt-1">ប្រភេទ</div></Card>
          <Card class="text-center py-4"><div class="text-2xl font-bold text-[#0f2a4a]">{{ totalHeads.toLocaleString() }}</div><div class="text-xs text-gray-500 mt-1">ក្បាល</div></Card>
          <Card class="text-center py-4"><div class="text-2xl font-bold text-[#0f2a4a]">{{ totalKg.toLocaleString() }}</div><div class="text-xs text-gray-500 mt-1">គីឡូ</div></Card>
        </div>
        <div v-if="lowStockProducts.length" class="bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-4 py-3 flex items-center gap-2">
          <span class="text-[#ea580c] font-bold text-sm">⚠️ ស្តុកស្ទើរអស់:</span>
          <span class="text-sm text-[#c2410c]">{{ lowStockProducts.map(p => `${p.name} (${p.heads} ក្បាល)`).join(', ') }}</span>
        </div>
      </div>

      <!-- Reports Quick Access -->
      <div v-if="role === 'admin'" class="mb-6">
        <button @click="navigate('reports')" class="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#0f2a4a] to-[#1a4a7a] rounded-2xl text-white hover:from-[#1a4a7a] transition-all group">
          <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:bg-white/30"><IconReport /></div>
          <div class="flex-1 text-left"><div class="font-bold text-base">មជ្ឈមណ្ឌលរបាយការណ៍</div><div class="text-sm text-white/70">Reports Center · ចូលមើលបានភ្លាម</div></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-[#00b4c8]"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      <!-- Recent Transactions -->
      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between mb-3"><h2 class="text-base font-bold text-gray-700">ការលក់ចុងក្រោយ</h2><button @click="navigate('stock')" class="text-xs text-[#00b4c8] font-semibold">ទាំងអស់</button></div>
          <div class="space-y-2">
            <Card v-for="s in recentSales.slice(0, 3)" :key="s.id" class="p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap"><span class="font-bold text-sm text-gray-800">{{ s.client }}</span><StatusBadge :status="s.status" /></div>
                  <div class="text-xs text-gray-400 mt-1">{{ s.invoiceNo }} · {{ s.product }} · {{ s.branch }}</div>
                </div>
                <div class="text-right flex-shrink-0 ml-3">
                  <div class="font-bold text-[#0f2a4a]">${{ s.total.toLocaleString() }}</div>
                  <div v-if="s.remaining > 0" class="text-xs text-[#dc2626] font-medium">ជំពាក់ ${{ s.remaining }}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div v-if="role === 'admin'">
          <div class="flex items-center justify-between mb-3"><h2 class="text-base font-bold text-gray-700">ការទិញចូលចុងក្រោយ</h2></div>
          <div class="space-y-2">
            <Card v-for="p in recentPurchases.slice(0, 2)" :key="p.id" class="p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="font-bold text-sm text-gray-800">{{ p.supplier }}</span><StatusBadge :status="p.status" /></div><div class="text-xs text-gray-400 mt-1">{{ p.invoiceNo }} · {{ p.product }} · {{ p.heads }} ក្បាល · {{ p.kg }} គីឡូ</div></div>
                <div class="text-right ml-3"><div class="font-bold text-[#0f2a4a]">${{ p.total.toLocaleString() }}</div><div v-if="p.remaining > 0" class="text-xs text-[#dc2626] font-medium">ជំពាក់ ${{ p.remaining }}</div></div>
              </div>
            </Card>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-3"><h2 class="text-base font-bold text-gray-700">ការផ្ទេរស្តុកចុងក្រោយ</h2></div>
          <div class="space-y-2">
            <Card v-for="t in recentTransfers" :key="t.id" class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="font-bold text-sm text-gray-800">{{ t.product }}</span><StatusBadge :status="t.status" /></div><div class="text-xs text-gray-400 mt-1">{{ t.from }} → {{ t.to }} · {{ t.heads }} ក្បាល · {{ t.kg }} គីឡូ</div></div>
                <div class="text-xs text-gray-400">{{ t.date }}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- ADVANCED VIEW -->
    <!-- ============================================================ -->
    <div v-if="viewMode === 'advanced'" class="space-y-6">
      <!-- KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="ចំណូលថ្ងៃនេះ" :value="`$${todayRevenue.toLocaleString()}`" sub="Today Revenue" color="navy">
          <template #icon><IconReport /></template>
        </KPICard>
        <KPICard label="ចំណាយថ្ងៃនេះ" :value="`$${todayExpense}`" sub="Today Expense" color="orange">
          <template #icon><IconExpense /></template>
        </KPICard>
        <KPICard label="Client ជំពាក់" :value="`$${totalDebt.toLocaleString()}`" sub="Outstanding" color="red">
          <template #icon><IconDebt /></template>
        </KPICard>
        <KPICard label="Supplier ជំពាក់" :value="`$${totalSupplierDebt.toLocaleString()}`" sub="Outstanding" color="orange">
          <template #icon><IconSupplier /></template>
        </KPICard>
      </div>

      <!-- KPI Row 2 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="ការលក់ថ្ងៃនេះ" :value="`${todaySalesCount} ប្រតិ`" sub="Transactions" color="green">
          <template #icon><IconSale /></template>
        </KPICard>
        <KPICard label="ស្តុកសរុប" :value="`${totalAllHeads.toLocaleString()} ក្បាល`" sub="All Branches" color="cyan">
          <template #icon><IconStock /></template>
        </KPICard>
        <KPICard label="ចំណេញប៉ាន់ស្មាន" :value="`$${(todayRevenue - todayExpense - 400).toLocaleString()}`" sub="Est. Today" color="purple">
          <template #icon><IconReport /></template>
        </KPICard>
        <KPICard label="Cash Balance" :value="`$${cashValue.toLocaleString()}`" sub="Available" color="navy">
          <template #icon><IconHome /></template>
        </KPICard>
      </div>

      <!-- Charts Row 1: Sales by Branch + Payment Status -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionLabel>ការលក់តាមសាខា</SectionLabel>
          <BarChart
            :data="salesByBranchData"
            :categories="{
              sales: { name: 'ចំណូល', color: '#0f2a4a' },
              paid: { name: 'បង់រួច', color: '#16a34a' },
              credit: { name: 'ជំពាក់', color: '#dc2626' },
            }"
            :y-axis="['sales', 'paid', 'credit']"
            x-axis="branch"
            :height="280"
            :hide-legend="false"
            :radius="4"
            :legend-position="LegendPosition.BottomCenter"
          />
        </Card>

        <Card>
          <SectionLabel>ស្ថានភាពបង់ប្រាក់</SectionLabel>
          <DonutChart
            :data="paymentStatusData"
            :categories="{
              paid: { name: 'បង់រួច', color: '#16a34a' },
              partial: { name: 'បង់ខ្លះ', color: '#ea580c' },
              credit: { name: 'ជំពាក់', color: '#dc2626' },
            }"
            :radius="120"
            :height="280"
            :hide-legend="false"
            :legend-position="LegendPosition.BottomCenter"
          />
        </Card>
      </div>

      <!-- Charts Row 2: Income vs Expense + Cash vs Bank -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionLabel>ចំណូល និងចំណាយ (សប្ដាហ៍នេះ)</SectionLabel>
          <AreaChart
            :data="incomeVsExpenseData"
            :categories="{
              income: { name: 'ចំណូល', color: '#16a34a' },
              expense: { name: 'ចំណាយ', color: '#ea580c' },
            }"
            :y-axis="['income', 'expense']"
            x-axis="date"
            :height="280"
            :hide-legend="false"
            :legend-position="LegendPosition.BottomCenter"
          />
        </Card>

        <Card>
          <SectionLabel>Cash vs Bank</SectionLabel>
          <div class="flex items-center gap-6">
            <DonutChart
              :data="cashBankData"
              :categories="{
                cash: { name: 'Cash', color: '#16a34a' },
                bank: { name: 'Bank', color: '#0097a7' },
              }"
              :radius="110"
              :height="250"
              :hide-legend="false"
              :legend-position="LegendPosition.BottomCenter"
            />
            <div class="flex-1 space-y-3">
              <div class="bg-[#dcfce7] rounded-xl p-3">
                <div class="text-2xl font-bold text-[#15803d]">${{ cashValue.toLocaleString() }}</div>
                <div class="text-xs text-[#15803d] font-semibold">💵 Cash</div>
              </div>
              <div class="bg-[#e0f9fb] rounded-xl p-3">
                <div class="text-2xl font-bold text-[#0097a7]">${{ bankValue.toLocaleString() }}</div>
                <div class="text-xs text-[#0097a7] font-semibold">🏦 Bank</div>
              </div>
              <div class="bg-[#e8eef5] rounded-xl p-3">
                <div class="text-2xl font-bold text-[#0f2a4a]">${{ totalCashBank.toLocaleString() }}</div>
                <div class="text-xs text-gray-500 font-semibold">សរុប</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Stock Summary by Branch -->
      <Card>
        <SectionLabel>ស្តុកតាមសាខា</SectionLabel>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">សាខា</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ក្បាល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">គីឡូ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(s, i) in stockByBranchData" :key="i" class="hover:bg-gray-50">
                <td class="py-3 font-medium text-gray-800">{{ s.branch }}</td>
                <td class="py-3 text-right font-semibold tabular-nums">{{ s.heads.toLocaleString() }}</td>
                <td class="py-3 text-right font-semibold tabular-nums">{{ s.kg.toLocaleString() }}</td>
                <td class="py-3">
                  <div class="w-full bg-gray-100 rounded-full h-2 max-w-[120px]">
                    <div class="h-2 rounded-full" :class="i === 0 ? 'bg-[#0f2a4a]' : i === 1 ? 'bg-[#0097a7]' : 'bg-[#7c3aed]'" :style="{ width: `${Math.min(100, (s.heads / 1650) * 100)}%` }" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Product Stock Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card v-for="p in allStocks" :key="p.name" :class="{ 'border-[#fed7aa] border-2': p.low }">
          <h4 class="font-bold text-gray-800 mb-2">{{ p.name }}</h4>
          <div class="space-y-1 mb-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">ក្បាល</span>
              <span class="font-semibold">{{ p.heads.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">គីឡូ</span>
              <span class="font-semibold">{{ p.kg.toLocaleString() }}</span>
            </div>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5">
            <div class="h-1.5 rounded-full" :class="p.low ? 'bg-[#ea580c]' : 'bg-[#16a34a]'" :style="{ width: `${Math.min(100, (p.heads / 600) * 100)}%` }" />
          </div>
          <p v-if="p.low" class="text-[10px] text-[#ea580c] font-semibold mt-1">⚠ ស្ទើរអស់</p>
        </Card>
      </div>

      <!-- Client & Supplier Debt Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionLabel>Client ជំពាក់ច្រើនជាងគេ</SectionLabel>
          <div class="space-y-3">
            <div v-for="c in clients.filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 5)" :key="c.id" class="flex items-center justify-between">
              <div class="flex-1">
                <span class="text-sm font-semibold text-gray-800">{{ c.name }}</span>
                <div class="text-xs text-gray-400">{{ c.invoices }} វិក្កយបត្រ</div>
              </div>
              <span class="text-sm font-bold text-[#dc2626]">${{ c.debt.toLocaleString() }}</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>Supplier ជំពាក់</SectionLabel>
          <div class="space-y-3">
            <div v-for="s in suppliers.filter(s => s.debt > 0)" :key="s.id" class="flex items-center justify-between">
              <div class="flex-1">
                <span class="text-sm font-semibold text-gray-800">{{ s.name }}</span>
                <div class="text-xs text-gray-400">${{ s.totalPurchase.toLocaleString() }} ទិញសរុប</div>
              </div>
              <span class="text-sm font-bold text-[#ea580c]">${{ s.debt.toLocaleString() }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Sales Trend -->
      <Card>
        <SectionLabel>និន្នាការលក់ (សប្ដាហ៍នេះ)</SectionLabel>
        <BarChart
          :data="salesByDayData"
          :categories="{
            sales: { name: 'ចំណូល', color: '#0f2a4a' },
            expense: { name: 'ចំណាយ', color: '#ea580c' },
          }"
          :y-axis="['sales', 'expense']"
          x-axis="date"
          :height="280"
          :hide-legend="false"
          :radius="4"
          :legend-position="LegendPosition.BottomCenter"
        />
      </Card>
    </div>

    <!-- FAB -->
    <div class="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40">
      <div v-if="fabOpen" class="flex flex-col items-end gap-2 mb-3">
        <div v-for="a in visibleFabActions" :key="a.screen" class="flex items-center gap-2">
          <span class="bg-[#0f2a4a] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">{{ a.label }}</span>
          <button @click="navigate(a.screen); fabOpen = false" class="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-[#0f2a4a] hover:bg-[#e0f9fb] transition-colors border border-gray-100">
            <component :is="a.icon" />
          </button>
        </div>
      </div>
      <button @click="fabOpen = !fabOpen" class="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all" :class="fabOpen ? 'bg-gray-600 rotate-45' : 'bg-[#00b4c8] hover:bg-[#0097a7]'">
        <IconClose v-if="fabOpen" /><IconAdd v-else />
      </button>
    </div>
    <div v-if="fabOpen" class="fixed inset-0 z-30" @click="fabOpen = false" />
  </div>
</template>
