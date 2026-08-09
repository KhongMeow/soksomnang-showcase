<script setup lang="ts">
import type {
  Sale, Purchase, StockTransfer, Expense, Client, Supplier, Product, Branch, Invoice,
} from "~/utils/data"

definePageMeta({ middleware: ["auth", "admin"] })

const route = useRoute()
const router = useRouter()
const api = useApi()
const type = computed(() => route.params.type as string)

const VALID_TYPES = ["sale", "purchase", "stock", "transfer", "client-debt", "supplier-debt", "income", "expense", "profit", "cashbank", "closing", "audit"]

const QUICK_FILTERS = ["ថ្ងៃនេះ", "ម្សិលមិញ", "សប្ដាហ៍នេះ", "ខែនេះ", "ជ្រើសរើស"]

const RECENT_SALES = ref<Sale[]>([])
const RECENT_PURCHASES = ref<Purchase[]>([])
const RECENT_TRANSFERS = ref<StockTransfer[]>([])
const RECENT_EXPENSES = ref<Expense[]>([])
const CLIENTS = ref<Client[]>([])
const CLIENT_INVOICES = ref<Record<string, Invoice[]>>({})
const SUPPLIERS = ref<Supplier[]>([])
const PRODUCTS = ref<Product[]>([])
const BRANCHES = ref<Branch[]>([])
const EXPENSE_CATEGORIES = ref<string[]>([])

interface ReportSamples {
  saleByBranch: { branch: string; sales: number; revenue: number; paid: number; credit: number }[]
  saleByStaff: { staff: string; sales: number; revenue: number }[]
  purchaseBySupplier: { supplier: string; purchases: number; total: number; paid: number; debt: number }[]
  stockMovements: { date: string; product: string; opening: number; purchase: number; transferIn: number; transferOut: number; sales: number; closing: number }[]
  dailyTransactions: { date: string; cashIncome: number; bankIncome: number; cashExpense: number; bankExpense: number; cashBalance: number; bankBalance: number }[]
  expenseBreakdown: { category: string; count: number; total: number }[]
  profitByBranch: { branch: string; revenue: number; cost: number; expense: number; profit: number }[]
  auditLog: { user: string; date: string; module: string; refNo: string; action: string; oldVal: string; newVal: string }[]
  monthlyClosing: { category: string; heads: number; kg: number; value: string }[]
  closingChecklist: { id: string; label: string; checked: boolean }[]
}

const SAMPLES = ref<ReportSamples>({
  saleByBranch: [],
  saleByStaff: [],
  purchaseBySupplier: [],
  stockMovements: [],
  dailyTransactions: [],
  expenseBreakdown: [],
  profitByBranch: [],
  auditLog: [],
  monthlyClosing: [
    { category: "Opening Stock", heads: 1350, kg: 3375, value: "$8,450" },
    { category: "Purchases", heads: 350, kg: 775, value: "$2,500" },
    { category: "Transfers In", heads: 80, kg: 200, value: "$640" },
    { category: "Transfers Out", heads: 260, kg: 625, value: "$2,080" },
    { category: "Sales", heads: 370, kg: 800, value: "$5,600" },
    { category: "Closing Stock", heads: 1150, kg: 2925, value: "$7,910" },
  ],
  closingChecklist: [
    { id: "stock", label: "ពិនិត្យស្តុក", checked: true },
    { id: "client-debt", label: "ពិនិត្យជំពាក់ Client", checked: true },
    { id: "supplier-debt", label: "ពិនិត្យជំពាក់ Supplier", checked: false },
    { id: "cash", label: "ពិនិត្យ Cash", checked: false },
    { id: "bank", label: "ពិនិត្យ Bank", checked: false },
    { id: "reports", label: "ពិនិត្យរបាយការណ៍", checked: false },
  ],
})

const filterBranch = ref("all")
const filterMonth = ref("08/2026")
const closingChecklist = ref(SAMPLES.value.closingChecklist)
const closingMonth = ref("08/2026")

onMounted(async () => {
  try {
    const [
      sales, purchases, transfers, expenses, clients, suppliers, products, branches,
      settings, salesReport, purchasesReport, expenseReport, profitReport,
      cashbankReport, audit, clientDebt,
    ] = await Promise.all([
      api.get<Sale[]>("/sales"),
      api.get<Purchase[]>("/purchases"),
      api.get<StockTransfer[]>("/transfers"),
      api.get<Expense[]>("/expenses"),
      api.get<Client[]>("/clients"),
      api.get<Supplier[]>("/suppliers"),
      api.get<Product[]>("/products"),
      api.get<Branch[]>("/branches"),
      api.get<any>("/settings"),
      api.get<any>("/reports/sales"),
      api.get<any>("/reports/purchases"),
      api.get<any>("/reports/expense"),
      api.get<any>("/reports/profit"),
      api.get<any>("/reports/cashbank"),
      api.get<any[]>("/audit"),
      api.get<any>("/reports/client-debt"),
    ])

    RECENT_SALES.value = sales
    RECENT_PURCHASES.value = purchases
    RECENT_TRANSFERS.value = transfers
    RECENT_EXPENSES.value = expenses
    CLIENTS.value = clients
    SUPPLIERS.value = suppliers
    PRODUCTS.value = products
    BRANCHES.value = branches
    EXPENSE_CATEGORIES.value = settings.expenseCategories ?? []

    const invMap: Record<string, Invoice[]> = {}
    for (const inv of clientDebt?.invoices ?? []) {
      const cid = inv.client?.id
      if (cid) {
        invMap[cid] = invMap[cid] || []
        invMap[cid].push(inv)
      }
    }
    CLIENT_INVOICES.value = invMap

    const byStaff: Record<string, any> = {}
    for (const s of sales) {
      byStaff[s.staff] = byStaff[s.staff] || { staff: s.staff, sales: 0, revenue: 0 }
      byStaff[s.staff].sales += 1
      byStaff[s.staff].revenue += s.total
    }

    SAMPLES.value = {
      ...SAMPLES.value,
      saleByBranch: salesReport?.byBranch ?? [],
      saleByStaff: Object.values(byStaff),
      purchaseBySupplier: purchasesReport?.bySupplier ?? [],
      stockMovements: products.map((p) => {
        const entries = Object.values(p.stock ?? {})
        const heads = entries.reduce((a, s) => a + (s?.heads ?? 0), 0)
        const kg = entries.reduce((a, s) => a + (s?.kg ?? 0), 0)
        return { date: "", product: p.name, opening: heads, purchase: 0, transferIn: 0, transferOut: 0, sales: 0, closing: heads }
      }),
      dailyTransactions: cashbankReport?.days ?? [],
      expenseBreakdown: expenseReport?.breakdown ?? [],
      profitByBranch: profitReport?.byBranch ?? [],
      auditLog: audit ?? [],
    }
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <!-- ============================================================ -->
  <!-- SALES REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'sale'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍លក់" :onBack="() => router.push('/reports')">
      <template #right>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">📄 PDF</button>
          <button class="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">📊 Excel</button>
          <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-colors">🖨 បោះពុម្ព</button>
        </div>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ RECENT_SALES.length }}</div>
        <div class="text-xs text-gray-500 mt-1">ការលក់សរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#16a34a]">${{ RECENT_SALES.reduce((a, s) => a + s.paid, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ប្រាក់ទទួលបាន</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#dc2626]">${{ RECENT_SALES.reduce((a, s) => a + s.remaining, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ជំពាក់</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">${{ RECENT_SALES.reduce((a, s) => a + s.total, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ចំណូលសរុប</div>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <Card>
        <SectionLabel>តាមសាខា</SectionLabel>
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">សាខា</th><th class="text-center text-xs font-semibold text-gray-500 pb-2">ចំនួន</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ចំណូល</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">បង់</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ជំពាក់</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in SAMPLES.saleByBranch" :key="b.branch" class="hover:bg-gray-50">
              <td class="py-2.5 font-medium text-gray-800">{{ b.branch }}</td>
              <td class="py-2.5 text-center font-semibold">{{ b.sales }}</td>
              <td class="py-2.5 text-right font-semibold text-[#0f2a4a]">${{ b.revenue.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#16a34a] font-semibold">${{ b.paid.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#dc2626] font-semibold">${{ b.credit.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionLabel>តាមបុគ្គលិក</SectionLabel>
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">បុគ្គលិក</th><th class="text-center text-xs font-semibold text-gray-500 pb-2">ចំនួន</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ចំណូល</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in SAMPLES.saleByStaff" :key="s.staff" class="hover:bg-gray-50">
              <td class="py-2.5 font-medium text-gray-800">{{ s.staff }}</td>
              <td class="py-2.5 text-center font-semibold">{{ s.sales }}</td>
              <td class="py-2.5 text-right font-semibold text-[#0f2a4a]">${{ s.revenue.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>

    <Card>
      <SectionLabel>ស្ថានភាពការបង់</SectionLabel>
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="text-center p-3 rounded-xl bg-[#dcfce7]">
          <div class="text-2xl font-bold text-[#15803d]">{{ RECENT_SALES.filter(s => s.status === 'paid').length }}</div>
          <div class="text-xs text-[#15803d] mt-1 font-semibold">បង់រួច</div>
        </div>
        <div class="text-center p-3 rounded-xl bg-[#fff7ed]">
          <div class="text-2xl font-bold text-[#c2410c]">{{ RECENT_SALES.filter(s => s.status === 'partial').length }}</div>
          <div class="text-xs text-[#c2410c] mt-1 font-semibold">បង់ខ្លះ</div>
        </div>
        <div class="text-center p-3 rounded-xl bg-[#fef2f2]">
          <div class="text-2xl font-bold text-[#dc2626]">{{ RECENT_SALES.filter(s => s.status === 'credit').length }}</div>
          <div class="text-xs text-[#dc2626] mt-1 font-semibold">ជំពាក់</div>
        </div>
      </div>
    </Card>

    <Card class="mt-5">
      <SectionLabel>ប្រតិបត្តិការ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">វិក្កយបត្រ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">អតិថិជន</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផលិតផល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ចំណូល</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in RECENT_SALES" :key="s.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3"><div class="font-mono text-xs text-[#0f2a4a] font-semibold">{{ s.invoiceNo }}</div><div class="text-xs text-gray-400">{{ s.date }}</div></td>
              <td class="py-3 pr-3"><div class="font-medium text-gray-800">{{ s.client }}</div><div class="text-xs text-gray-400">{{ s.branch }}</div></td>
              <td class="py-3 pr-3"><div class="text-sm text-gray-700">{{ s.product }}</div><div class="text-xs text-gray-400">{{ s.qty }} {{ s.unit }}</div></td>
              <td class="py-3 text-right"><div class="font-bold text-[#0f2a4a]">${{ s.total }}</div><div v-if="s.remaining > 0" class="text-xs text-[#dc2626]">ជំពាក់ ${{ s.remaining }}</div></td>
              <td class="py-3 text-center"><StatusBadge :status="s.status" /></td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td colspan="3" class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold text-[#0f2a4a]">${{ RECENT_SALES.reduce((a, s) => a + s.total, 0).toLocaleString() }}</td><td /></tr></tfoot>
        </table>
      </div>
    </Card>
    <Card class="mt-5">
      <SectionLabel>លក់តាមឯកតា</SectionLabel>
      <div class="grid grid-cols-3 gap-3">
        <div class="text-center p-3 rounded-xl bg-[#e0f9fb]">
          <div class="text-xl font-bold text-[#0097a7]">{{ RECENT_SALES.filter(s => s.unit === 'taka').length }}</div>
          <div class="text-xs text-[#0097a7] mt-1 font-semibold">🐓 តាការ</div>
          <div class="text-xs text-gray-500">${{ RECENT_SALES.filter(s => s.unit === 'taka').reduce((a, s) => a + s.total, 0).toLocaleString() }}</div>
        </div>
        <div class="text-center p-3 rounded-xl bg-[#dcfce7]">
          <div class="text-xl font-bold text-[#15803d]">{{ RECENT_SALES.filter(s => s.unit === 'head').length }}</div>
          <div class="text-xs text-[#15803d] mt-1 font-semibold">🐔 ក្បាល</div>
          <div class="text-xs text-gray-500">${{ RECENT_SALES.filter(s => s.unit === 'head').reduce((a, s) => a + s.total, 0).toLocaleString() }}</div>
        </div>
        <div class="text-center p-3 rounded-xl bg-[#e8eef5]">
          <div class="text-xl font-bold text-[#1a4a7a]">{{ RECENT_SALES.filter(s => s.unit === 'kg').length }}</div>
          <div class="text-xs text-[#1a4a7a] mt-1 font-semibold">⚖️ គីឡូ</div>
          <div class="text-xs text-gray-500">${{ RECENT_SALES.filter(s => s.unit === 'kg').reduce((a, s) => a + s.total, 0).toLocaleString() }}</div>
        </div>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- PURCHASE REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'purchase'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ទិញចូល" :onBack="() => router.push('/reports')">
      <template #right>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50">📄 PDF</button>
          <button class="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50">📊 Excel</button>
          <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
        </div>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
      <select v-model="filterBranch" class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200">
        <option value="all">គ្រប់សាខា</option>
        <option v-for="b in BRANCHES" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ RECENT_PURCHASES.length }}</div>
        <div class="text-xs text-gray-500 mt-1">ទិញចូលសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ RECENT_PURCHASES.reduce((a, p) => a + p.heads, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ក្បាលសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">${{ RECENT_PURCHASES.reduce((a, p) => a + p.total, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ចំណាយសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#dc2626]">${{ RECENT_PURCHASES.reduce((a, p) => a + p.remaining, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ជំពាក់ Supplier</div>
      </Card>
    </div>

    <Card class="mb-5">
      <SectionLabel>តាម Supplier</SectionLabel>
      <table class="w-full text-sm">
        <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">Supplier</th><th class="text-center text-xs font-semibold text-gray-500 pb-2">ចំនួន</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">សរុប</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">បង់</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ជំពាក់</th></tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="s in SAMPLES.purchaseBySupplier" :key="s.supplier" class="hover:bg-gray-50">
            <td class="py-2.5 font-medium text-gray-800">{{ s.supplier }}</td>
            <td class="py-2.5 text-center font-semibold">{{ s.purchases }}</td>
            <td class="py-2.5 text-right font-semibold text-[#0f2a4a]">${{ s.total.toLocaleString() }}</td>
            <td class="py-2.5 text-right text-[#16a34a] font-semibold">${{ s.paid.toLocaleString() }}</td>
            <td class="py-2.5 text-right font-semibold" :class="s.debt > 0 ? 'text-[#dc2626]' : 'text-gray-400'">{{ s.debt > 0 ? `$${s.debt}` : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Card>
      <SectionLabel>ប្រតិបត្តិការទិញចូល</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">វិក្កយបត្រ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">Supplier</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផលិតផល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ក្បាល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">គីឡូ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">សរុប</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="p in RECENT_PURCHASES" :key="p.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3"><div class="font-mono text-xs text-[#0f2a4a] font-semibold">{{ p.invoiceNo }}</div><div class="text-xs text-gray-400">{{ p.date }}</div></td>
              <td class="py-3 pr-3 font-medium text-gray-800">{{ p.supplier }}</td>
              <td class="py-3 pr-3 text-gray-700">{{ p.product }}</td>
              <td class="py-3 text-right font-semibold">{{ p.heads.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold">{{ p.kg.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold text-[#0f2a4a]">${{ p.total.toLocaleString() }}</td>
              <td class="py-3 text-center"><StatusBadge :status="p.status" /></td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td colspan="5" class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold text-[#0f2a4a]">${{ RECENT_PURCHASES.reduce((a, p) => a + p.total, 0).toLocaleString() }}</td><td /></tr></tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- STOCK REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'stock'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ស្តុក" :onBack="() => router.push('/reports')">
      <template #right>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50">📄 PDF</button>
          <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
        </div>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ PRODUCTS.length }}</div>
        <div class="text-xs text-gray-500 mt-1">ផលិតផល</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ PRODUCTS.reduce((a, p) => a + Object.values(p.stock).reduce((h, s) => h + s.heads, 0), 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ក្បាលសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ PRODUCTS.reduce((a, p) => a + Object.values(p.stock).reduce((h, s) => h + s.kg, 0), 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">គីឡូសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#ea580c]">{{ PRODUCTS.filter(p => Object.values(p.stock).some(s => s.heads < 150)).length }}</div>
        <div class="text-xs text-gray-500 mt-1">⚠ ស្ទើរអស់</div>
      </Card>
    </div>

    <Card class="mb-5">
      <SectionLabel>ចលនាស្តុក</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">ផលិតផល</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ដើម</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ទិញចូល</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ផ្ទេរចូល</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ផ្ទេរចេញ</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">លក់</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ចុង</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in SAMPLES.stockMovements" :key="s.product" class="hover:bg-gray-50">
              <td class="py-2.5 font-medium text-gray-800">{{ s.product }}</td>
              <td class="py-2.5 text-right tabular-nums">{{ s.opening.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#16a34a] tabular-nums">+{{ s.purchase.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#16a34a] tabular-nums">+{{ s.transferIn.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#dc2626] tabular-nums">-{{ s.transferOut.toLocaleString() }}</td>
              <td class="py-2.5 text-right text-[#dc2626] tabular-nums">-{{ s.sales.toLocaleString() }}</td>
              <td class="py-2.5 text-right font-bold tabular-nums" :class="s.closing < 150 ? 'text-[#ea580c]' : 'text-[#0f2a4a]'">{{ s.closing.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card class="p-4" v-for="p in PRODUCTS" :key="p.id" :class="{ 'border-[#fed7aa] border-2': Object.values(p.stock).some(s => s.heads < 150) }">
        <h3 class="font-bold text-gray-800 mb-2">{{ p.name }}</h3>
        <div class="space-y-2 text-sm">
          <div v-for="(stock, branchId) in p.stock" :key="branchId" class="flex justify-between py-1 border-b border-gray-50 last:border-0">
            <span class="text-gray-500">{{ BRANCHES.find(b => b.id === branchId)?.name }}</span>
            <span class="font-semibold">
              {{ stock.heads }} ក្បាល · {{ stock.kg }} គីឡូ
              <span v-if="stock.heads < 150" class="text-[#ea580c] text-xs ml-1">⚠</span>
            </span>
            </div>
        </div>
      </Card>
    </div>

    <Card class="mb-5">
      <SectionLabel>ការកែសម្រួល និងបាត់បង់ស្តុក</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">ថ្ងៃ</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">ផលិតផល</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">ប្រភេទ</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ក្បាលមុន</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">កែ</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ក្រោយ</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">មូលហេតុ</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr class="hover:bg-gray-50"><td class="py-2.5 text-gray-600">2026-08-01</td><td class="py-2.5 font-medium text-gray-800">មាន់រស់</td><td class="py-2.5"><span class="bg-[#fff7ed] text-[#c2410c] px-2 py-0.5 rounded-full text-xs font-semibold">មាន់ងាប់</span></td><td class="py-2.5 text-right tabular-nums">600</td><td class="py-2.5 text-right tabular-nums text-[#dc2626]">-5</td><td class="py-2.5 text-right font-bold tabular-nums">595</td><td class="py-2.5 text-gray-600 text-sm">ងាប់ក្នុងការដឹក</td></tr>
            <tr class="hover:bg-gray-50"><td class="py-2.5 text-gray-600">2026-07-30</td><td class="py-2.5 font-medium text-gray-800">មាន់សាច់</td><td class="py-2.5"><span class="bg-[#e8eef5] text-[#0f2a4a] px-2 py-0.5 rounded-full text-xs font-semibold">រាប់ស្តុកឡើងវិញ</span></td><td class="py-2.5 text-right tabular-nums">310</td><td class="py-2.5 text-right tabular-nums text-[#16a34a]">+10</td><td class="py-2.5 text-right font-bold tabular-nums">320</td><td class="py-2.5 text-gray-600 text-sm">គណនាស្តុកខុស</td></tr>
            <tr class="hover:bg-gray-50"><td class="py-2.5 text-gray-600">2026-07-28</td><td class="py-2.5 font-medium text-gray-800">មាន់ទា</td><td class="py-2.5"><span class="bg-[#fef2f2] text-[#dc2626] px-2 py-0.5 rounded-full text-xs font-semibold">បាត់បង់</span></td><td class="py-2.5 text-right tabular-nums">290</td><td class="py-2.5 text-right tabular-nums text-[#dc2626]">-8</td><td class="py-2.5 text-right font-bold tabular-nums">282</td><td class="py-2.5 text-gray-600 text-sm">មិនដឹងមូលហេតុ</td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- TRANSFER REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'transfer'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ផ្ទេរស្តុក" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ RECENT_TRANSFERS.length }}</div>
        <div class="text-xs text-gray-500 mt-1">ការផ្ទេរសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ RECENT_TRANSFERS.reduce((a, t) => a + t.heads, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ក្បាលសរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#16a34a]">{{ RECENT_TRANSFERS.filter(t => t.status === 'received').length }}</div>
        <div class="text-xs text-gray-500 mt-1">បានទទួល</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#ea580c]">{{ RECENT_TRANSFERS.filter(t => t.status === 'pending').length }}</div>
        <div class="text-xs text-gray-500 mt-1">កំពុងរង់ចាំ</div>
      </Card>
    </div>

    <Card>
      <SectionLabel>ប្រតិបត្តិការផ្ទេរ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">លេខផ្ទេរ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផ្ទេរចេញ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផ្ទេរទៅ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផលិតផល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ក្បាល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">គីឡូ</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="t in RECENT_TRANSFERS" :key="t.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3"><div class="font-mono text-xs text-[#0f2a4a] font-semibold">{{ t.transferNo }}</div><div class="text-xs text-gray-400">{{ t.date }}</div></td>
              <td class="py-3 pr-3 font-medium text-gray-800">{{ t.from }}</td>
              <td class="py-3 pr-3 font-medium text-gray-800">{{ t.to }}</td>
              <td class="py-3 pr-3 text-gray-700">{{ t.product }}</td>
              <td class="py-3 text-right font-semibold">{{ t.heads.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold">{{ t.kg.toLocaleString() }}</td>
              <td class="py-3 text-center"><StatusBadge :status="t.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- CLIENT DEBT REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'client-debt'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ជំពាក់ Client" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#dc2626]">${{ CLIENTS.reduce((a, c) => a + c.debt, 0).toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ជំពាក់សរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ CLIENTS.filter(c => c.debt > 0).length }}</div>
        <div class="text-xs text-gray-500 mt-1">អតិថិជនមានជំពាក់</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#16a34a]">{{ CLIENTS.filter(c => c.debt === 0).length }}</div>
        <div class="text-xs text-gray-500 mt-1">បានទូទាត់ហើយ</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">$1,200</div>
        <div class="text-xs text-gray-500 mt-1">ប្រមូលបានសប្ដាហ៍នេះ</div>
      </Card>
    </div>

    <Card>
      <SectionLabel>បញ្ជីជំពាក់តាម Client</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">អតិថិជន</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ទូរស័ព្ទ</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">វិក្កយបត្រ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ជំពាក់</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">បង់ចុងក្រោយ</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in CLIENTS" :key="c.id" class="hover:bg-gray-50" :class="{ 'bg-[#fef2f2]/50': c.debt > 0 }">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ c.name }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ c.phone }}</td>
              <td class="py-3 text-center font-semibold">{{ c.invoices }}</td>
              <td class="py-3 text-right font-bold" :class="c.debt > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'">{{ c.debt > 0 ? `$${c.debt.toLocaleString()}` : '—' }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ c.lastPayment || '—' }}</td>
              <td class="py-3 text-center"><StatusBadge :status="c.debt > 0 ? 'credit' : 'paid'" /></td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td colspan="3" class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold text-[#dc2626]">${{ CLIENTS.reduce((a, c) => a + c.debt, 0).toLocaleString() }}</td><td colspan="2" /></tr></tfoot>
        </table>
      </div>
    </Card>

    <Card class="mt-5">
      <SectionLabel>សំណងជំពាក់</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">វិក្កយបត្រ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">អតិថិជន</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ផលិតផល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">សរុប</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">បង់</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ជំពាក់</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in CLIENTS.filter(c => c.debt > 0)" :key="c.id">
              <template v-for="inv in (CLIENT_INVOICES[c.id] ?? [])" :key="inv.id">
                <tr class="hover:bg-gray-50">
                  <td class="py-3 pr-3"><div class="font-mono text-xs text-[#0f2a4a] font-semibold">{{ inv.invoiceNo }}</div><div class="text-xs text-gray-400">{{ inv.date }}</div></td>
                  <td class="py-3 pr-3 font-medium text-gray-800">{{ c.name }}</td>
                  <td class="py-3 pr-3 text-gray-700">{{ inv.product }}</td>
                  <td class="py-3 text-right font-semibold">${{ inv.total }}</td>
                  <td class="py-3 text-right text-[#16a34a] font-semibold">${{ inv.paid }}</td>
                  <td class="py-3 text-right font-bold" :class="inv.remaining > 0 ? 'text-[#dc2626]' : 'text-gray-400'">${{ inv.remaining }}</td>
                  <td class="py-3 text-center"><StatusBadge :status="inv.status" /></td>
                </tr>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <Card class="mt-5">
      <SectionLabel>ប្រវត្តិការទូទាត់ Client</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-2">លេខទទួល</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">Client</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">វិក្កយបត្រ</th><th class="text-right text-xs font-semibold text-gray-500 pb-2">ចំនួន</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">វិធី</th><th class="text-left text-xs font-semibold text-gray-500 pb-2">ថ្ងៃ</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr class="hover:bg-gray-50"><td class="py-2.5 font-mono text-xs text-[#0f2a4a] font-semibold">REC-0301</td><td class="py-2.5 font-medium text-gray-800">ម៉ូយ ចាន់ណា</td><td class="py-2.5 text-gray-600 text-xs">INV-0795</td><td class="py-2.5 text-right font-bold text-[#16a34a]">$300</td><td class="py-2.5"><span class="bg-[#e8eef5] text-[#0f2a4a] px-2 py-0.5 rounded-full text-xs font-semibold">💵 Cash</span></td><td class="py-2.5 text-gray-600 text-xs">2026-08-02</td></tr>
            <tr class="hover:bg-gray-50"><td class="py-2.5 font-mono text-xs text-[#0f2a4a] font-semibold">REC-0300</td><td class="py-2.5 font-medium text-gray-800">ហាង សំណាង</td><td class="py-2.5 text-gray-600 text-xs">INV-0785</td><td class="py-2.5 text-right font-bold text-[#16a34a]">$300</td><td class="py-2.5"><span class="bg-[#e0f9fb] text-[#0097a7] px-2 py-0.5 rounded-full text-xs font-semibold">🏦 Bank</span></td><td class="py-2.5 text-gray-600 text-xs">2026-08-01</td></tr>
            <tr class="hover:bg-gray-50"><td class="py-2.5 font-mono text-xs text-[#0f2a4a] font-semibold">REC-0299</td><td class="py-2.5 font-medium text-gray-800">ម៉ូយ ចាន់ណា</td><td class="py-2.5 text-gray-600 text-xs">INV-0790</td><td class="py-2.5 text-right font-bold text-[#16a34a]">$500</td><td class="py-2.5"><span class="bg-[#e8eef5] text-[#0f2a4a] px-2 py-0.5 rounded-full text-xs font-semibold">💵 Cash</span></td><td class="py-2.5 text-gray-600 text-xs">2026-07-30</td></tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td colspan="3" class="pt-2 text-sm font-bold text-gray-700">សរុប</td><td class="pt-2 text-right font-bold text-[#16a34a]">$1,100</td><td colspan="2" /></tr></tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- SUPPLIER DEBT REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'supplier-debt'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ជំពាក់ Supplier" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KPICard label="ជំពាក់សរុប" value="$4,300" sub="Total Supplier Debt" color="orange">
        <template #icon><IconDebt /></template>
      </KPICard>
      <KPICard label="Supplier" value="2" sub="With outstanding debt" color="red">
        <template #icon><IconSupplier /></template>
      </KPICard>
      <KPICard label="បានទូទាត់ខែនេះ" :value="`$3,500`" sub="Paid this month" color="green">
        <template #icon><IconCheck /></template>
      </KPICard>
      <KPICard label="ទិញចូលសរុប" :value="`$${RECENT_PURCHASES.reduce((a, p) => a + p.total, 0).toLocaleString()}`" sub="Total Purchase" color="navy">
        <template #icon><IconPurchase /></template>
      </KPICard>
    </div>

    <Card>
      <SectionLabel>បញ្ជីជំពាក់តាម Supplier</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">Supplier</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ទូរស័ព្ទ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ទិញសរុប</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ជំពាក់</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in SUPPLIERS" :key="s.id" class="hover:bg-gray-50" :class="{ 'bg-[#fff7ed]/50': s.debt > 0 }">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ s.name }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ s.phone }}</td>
              <td class="py-3 text-right font-semibold">${{ s.totalPurchase.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold" :class="s.debt > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'">{{ s.debt > 0 ? `$${s.debt.toLocaleString()}` : '—' }}</td>
              <td class="py-3 text-center"><StatusBadge :status="s.debt > 0 ? 'partial' : 'paid'" /></td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td colspan="3" class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold text-[#ea580c]">${{ SUPPLIERS.reduce((a, s) => a + s.debt, 0).toLocaleString() }}</td><td /></tr></tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- INCOME REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'income'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ចំណូល" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KPICard label="ចំណូលសរុប" :value="`$${SAMPLES.dailyTransactions.reduce((a, d) => a + d.cashIncome + d.bankIncome, 0).toLocaleString()}`" sub="Total Income" color="navy">
        <template #icon><IconReport /></template>
      </KPICard>
      <KPICard label="Cash" :value="`$${SAMPLES.dailyTransactions.reduce((a, d) => a + d.cashIncome, 0).toLocaleString()}`" sub="Cash Income" color="green">
        <template #icon><IconSale /></template>
      </KPICard>
      <KPICard label="Bank" :value="`$${SAMPLES.dailyTransactions.reduce((a, d) => a + d.bankIncome, 0).toLocaleString()}`" sub="Bank Income" color="cyan">
        <template #icon><IconTransfer /></template>
      </KPICard>
      <KPICard label="ជាមធ្យម" :value="`$${Math.round(SAMPLES.dailyTransactions.reduce((a, d) => a + d.cashIncome + d.bankIncome, 0) / SAMPLES.dailyTransactions.length).toLocaleString()}`" sub="Avg/Day" color="purple">
        <template #icon><IconReport /></template>
      </KPICard>
    </div>

    <Card>
      <SectionLabel>ចំណូលប្រចាំថ្ងៃ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">ថ្ងៃ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Cash</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Bank</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">សរុប</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="d in SAMPLES.dailyTransactions" :key="d.date" class="hover:bg-gray-50">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ d.date }}</td>
              <td class="py-3 text-right font-semibold text-[#16a34a]">${{ d.cashIncome.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#0097a7]">${{ d.bankIncome.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold text-[#0f2a4a]">${{ (d.cashIncome + d.bankIncome).toLocaleString() }}</td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold text-[#16a34a]">${{ SAMPLES.dailyTransactions.reduce((a, d) => a + d.cashIncome, 0).toLocaleString() }}</td><td class="pt-3 text-right font-bold text-[#0097a7]">${{ SAMPLES.dailyTransactions.reduce((a, d) => a + d.bankIncome, 0).toLocaleString() }}</td><td class="pt-3 text-right font-bold text-[#0f2a4a]">${{ SAMPLES.dailyTransactions.reduce((a, d) => a + d.cashIncome + d.bankIncome, 0).toLocaleString() }}</td></tr></tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- EXPENSE REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'expense'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ចំណាយ" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KPICard label="ចំណាយសរុប" :value="`$${SAMPLES.expenseBreakdown.reduce((a, e) => a + e.total, 0).toLocaleString()}`" sub="Total Expense" color="orange">
        <template #icon><IconExpense /></template>
      </KPICard>
      <KPICard label="ចំនួនចំណាយ" :value="`${SAMPLES.expenseBreakdown.reduce((a, e) => a + e.count, 0)}`" sub="Total Items" color="navy">
        <template #icon><IconReport /></template>
      </KPICard>
      <KPICard label="ច្រើនជាងគេ" :value="SAMPLES.expenseBreakdown.reduce((max, e) => e.total > max.total ? e : max, SAMPLES.expenseBreakdown[0]).category" sub="Top Category" color="red">
        <template #icon><IconExpense /></template>
      </KPICard>
      <KPICard label="ជាមធ្យម/ថ្ងៃ" :value="`$${Math.round(SAMPLES.expenseBreakdown.reduce((a, e) => a + e.total, 0) / 3)}`" sub="Avg/Day" color="purple">
        <template #icon><IconReport /></template>
      </KPICard>
    </div>

    <Card class="mb-5">
      <SectionLabel>ចំណាយតាមប្រភេទ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">ប្រភេទ</th><th class="text-center text-xs font-semibold text-gray-500 pb-3">ចំនួន</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">សរុប</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="e in SAMPLES.expenseBreakdown" :key="e.category" class="hover:bg-gray-50">
              <td class="py-3 font-medium text-gray-800">{{ e.category }}</td>
              <td class="py-3 text-center font-semibold">{{ e.count }}</td>
              <td class="py-3 text-right font-bold text-[#ea580c]">${{ e.total.toLocaleString() }}</td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-center font-bold">{{ SAMPLES.expenseBreakdown.reduce((a, e) => a + e.count, 0) }}</td><td class="pt-3 text-right font-bold text-[#ea580c]">${{ SAMPLES.expenseBreakdown.reduce((a, e) => a + e.total, 0).toLocaleString() }}</td></tr></tfoot>
        </table>
      </div>
    </Card>

    <Card>
      <SectionLabel>ចំណាយចុងក្រោយ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">ថ្ងៃ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ប្រភេទ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">ព័ត៌មាន</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ចំនួន</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">វិធី</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="e in RECENT_EXPENSES" :key="e.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3 text-gray-600">{{ e.date }}</td>
              <td class="py-3 pr-3"><span class="bg-[#fff7ed] text-[#c2410c] px-2 py-0.5 rounded-full text-xs font-semibold">{{ e.category }}</span></td>
              <td class="py-3 pr-3 text-gray-700">{{ e.description }}</td>
              <td class="py-3 text-right font-bold text-[#ea580c]">${{ e.amount }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ e.method === 'cash' ? '💵 Cash' : '🏦 Bank' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- PROFIT REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'profit'" class="max-w-5xl mx-auto">
    <PageHeader title="របាយការណ៍ចំណេញ" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in QUICK_FILTERS" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KPICard label="ចំណូល" :value="`$${SAMPLES.profitByBranch.reduce((a, b) => a + b.revenue, 0).toLocaleString()}`" sub="Sales Revenue" color="navy">
        <template #icon><IconSale /></template>
      </KPICard>
      <KPICard label="ថ្លៃដើម" :value="`$${SAMPLES.profitByBranch.reduce((a, b) => a + b.cost, 0).toLocaleString()}`" sub="Cost of Goods" color="orange">
        <template #icon><IconExpense /></template>
      </KPICard>
      <KPICard label="ចំណេញសរុប" :value="`$${SAMPLES.profitByBranch.reduce((a, b) => a + b.profit - b.expense, 0).toLocaleString()}`" sub="Net Profit" color="green">
        <template #icon><IconReport /></template>
      </KPICard>
      <KPICard label="ចំណេញ/ក្បាល" :value="`$3.45`" sub="Avg Profit/Head" color="cyan">
        <template #icon><IconDebt /></template>
      </KPICard>
    </div>

    <Card class="mb-5">
      <SectionLabel>ចំណេញតាមសាខា</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">សាខា</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ចំណូល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ថ្លៃដើម</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ចំណាយ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ចំណេញ</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in SAMPLES.profitByBranch" :key="b.branch" class="hover:bg-gray-50">
              <td class="py-3 font-medium text-gray-800">{{ b.branch }}</td>
              <td class="py-3 text-right font-semibold text-[#15803d]">${{ b.revenue.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#c2410c]">${{ b.cost.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#c2410c]">${{ b.expense.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold" :class="b.profit >= 0 ? 'text-[#15803d]' : 'text-[#dc2626]'">${{ (b.profit - b.expense).toLocaleString() }}</td>
            </tr>
          </tbody>
          <tfoot><tr class="border-t-2 border-gray-100"><td class="pt-3 text-sm font-bold text-gray-700">សរុប</td><td class="pt-3 text-right font-bold">${{ SAMPLES.profitByBranch.reduce((a, b) => a + b.revenue, 0).toLocaleString() }}</td><td class="pt-3 text-right font-bold">${{ SAMPLES.profitByBranch.reduce((a, b) => a + b.cost, 0).toLocaleString() }}</td><td class="pt-3 text-right font-bold">${{ SAMPLES.profitByBranch.reduce((a, b) => a + b.expense, 0).toLocaleString() }}</td><td class="pt-3 text-right font-bold" :class="SAMPLES.profitByBranch.reduce((a, b) => a + b.profit - b.expense, 0) >= 0 ? 'text-[#15803d]' : 'text-[#dc2626]'">${{ SAMPLES.profitByBranch.reduce((a, b) => a + b.profit - b.expense, 0).toLocaleString() }}</td></tr></tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- CASH & BANK REPORT -->
  <!-- ============================================================ -->
  <div v-if="type === 'cashbank'" class="max-w-5xl mx-auto">
    <PageHeader title="Cash & Bank Report" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <KPICard label="Cash Balance" :value="`$${SAMPLES.dailyTransactions[0].cashBalance.toLocaleString()}`" sub="Current" color="green">
        <template #icon><IconSale /></template>
      </KPICard>
      <KPICard label="Bank Balance" :value="`$${SAMPLES.dailyTransactions[0].bankBalance.toLocaleString()}`" sub="Current" color="cyan">
        <template #icon><IconTransfer /></template>
      </KPICard>
      <KPICard label="Cash In (Today)" :value="`$${SAMPLES.dailyTransactions[0].cashIncome.toLocaleString()}`" sub="Income" color="navy">
        <template #icon><IconReport /></template>
      </KPICard>
      <KPICard label="Cash Out (Today)" :value="`$${SAMPLES.dailyTransactions[0].cashExpense.toLocaleString()}`" sub="Expense" color="orange">
        <template #icon><IconExpense /></template>
      </KPICard>
    </div>

    <Card>
      <SectionLabel>Cash & Bank Summary</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">ថ្ងៃ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Cash In</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Cash Out</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Cash Balance</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Bank In</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Bank Out</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">Bank Balance</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="d in SAMPLES.dailyTransactions" :key="d.date" class="hover:bg-gray-50">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ d.date }}</td>
              <td class="py-3 text-right font-semibold text-[#16a34a]">${{ d.cashIncome.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#dc2626]">${{ d.cashExpense.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold text-[#0f2a4a]">${{ d.cashBalance.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#16a34a]">${{ d.bankIncome.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold text-[#dc2626]">${{ d.bankExpense.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold text-[#0f2a4a]">${{ d.bankBalance.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- MONTHLY CLOSING -->
  <!-- ============================================================ -->
  <div v-if="type === 'closing'" class="max-w-3xl mx-auto">
    <PageHeader title="បិទបញ្ជីប្រចាំខែ" :onBack="() => router.push('/reports')" />

    <div class="flex items-center gap-3 mb-6">
      <label class="text-sm font-semibold text-gray-700">ខែបិទបញ្ជី:</label>
      <input type="text" v-model="closingMonth" class="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700" />
    </div>

    <Card class="mb-5">
      <SectionLabel>សង្ខេបស្តុកប្រចាំខែ</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">ប្រភេទ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">ក្បាល</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">គីឡូ</th><th class="text-right text-xs font-semibold text-gray-500 pb-3">តម្លៃ</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="m in SAMPLES.monthlyClosing" :key="m.category" class="hover:bg-gray-50">
              <td class="py-3 font-medium text-gray-800">{{ m.category }}</td>
              <td class="py-3 text-right font-semibold tabular-nums">{{ m.heads.toLocaleString() }}</td>
              <td class="py-3 text-right font-semibold tabular-nums">{{ m.kg.toLocaleString() }}</td>
              <td class="py-3 text-right font-bold tabular-nums text-[#0f2a4a]">{{ m.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
      <KPICard label="ចំណូល" value="$5,600" sub="This Month" color="navy"><template #icon><IconSale /></template></KPICard>
      <KPICard label="ចំណាយ" value="$1,155" sub="This Month" color="orange"><template #icon><IconExpense /></template></KPICard>
      <KPICard label="ចំណេញ" value="$4,445" sub="Gross Profit" color="green"><template #icon><IconReport /></template></KPICard>
      <KPICard label="Client ជំពាក់" :value="`$${CLIENTS.reduce((a, c) => a + c.debt, 0).toLocaleString()}`" sub="Outstanding" color="red"><template #icon><IconDebt /></template></KPICard>
      <KPICard label="Supplier ជំពាក់" :value="`$${SUPPLIERS.reduce((a, s) => a + s.debt, 0).toLocaleString()}`" sub="Outstanding" color="orange"><template #icon><IconDebt /></template></KPICard>
      <KPICard label="Cash Balance" value="$3,200" sub="Current" color="green"><template #icon><IconReport /></template></KPICard>
    </div>

    <Card class="mb-5">
      <SectionLabel>បញ្ជីពិនិត្យមុនបិទ</SectionLabel>
      <div class="space-y-3">
        <div v-for="item in closingChecklist" :key="item.id"
          class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
          :class="item.checked ? 'bg-[#dcfce7]' : 'bg-gray-50'"
          @click="item.checked = !item.checked"
        >
          <div class="w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            :class="item.checked ? 'bg-[#16a34a] border-[#16a34a]' : 'border-gray-300'">
            <svg v-if="item.checked" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="w-4 h-4"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <span class="text-sm font-semibold" :class="item.checked ? 'text-[#15803d]' : 'text-gray-600'">{{ item.label }}</span>
        </div>
      </div>
    </Card>

    <div class="bg-[#fef2f2] border border-[#fca5a5] rounded-2xl p-5 mb-5">
      <div class="flex items-start gap-3">
        <span class="text-2xl flex-shrink-0">⚠️</span>
        <div>
          <h3 class="font-bold text-[#b91c1c] mb-1">ការព្រមាន</h3>
          <p class="text-sm text-[#991b1b]">
            បន្ទាប់ពីបិទបញ្ជីប្រចាំខែ រាល់ប្រតិបត្តិការមុនខែនេះមិនអាចកែប្រែបានទេ លើកលែងតែមានការអនុញ្ញាតពី Admin និងមានកំណត់ត្រា Audit ។
          </p>
        </div>
      </div>
    </div>

    <div class="flex gap-3 mb-8">
      <button
        :disabled="!closingChecklist.every(i => i.checked)"
        class="flex-1 py-4 rounded-xl text-white font-bold text-base transition-colors"
        :class="closingChecklist.every(i => i.checked) ? 'bg-[#6d28d9] hover:bg-[#5b21b6] shadow-lg' : 'bg-gray-300 cursor-not-allowed'"
      >
        🔒 បិទបញ្ជីប្រចាំខែ
      </button>
      <button @click="router.push('/dashboard')" class="px-6 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
        បោះបង់
      </button>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- AUDIT HISTORY -->
  <!-- ============================================================ -->
  <div v-if="type === 'audit'" class="max-w-5xl mx-auto">
    <PageHeader title="Audit History" :onBack="() => router.push('/reports')">
      <template #right>
        <button class="px-3 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a]">🖨 បោះពុម្ព</button>
      </template>
    </PageHeader>

    <div class="flex gap-2 overflow-x-auto pb-1 mb-5 flex-wrap">
      <button v-for="f in ['ទាំងអស់', 'Created', 'Edited', 'Cancelled', 'Adjusted', 'Price Change']" :key="f"
        class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-gray-300">
        {{ f }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#0f2a4a]">{{ SAMPLES.auditLog.length }}</div>
        <div class="text-xs text-gray-500 mt-1">សរុប</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#16a34a]">{{ SAMPLES.auditLog.filter(a => a.action === 'Created').length }}</div>
        <div class="text-xs text-gray-500 mt-1">Created</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#ea580c]">{{ SAMPLES.auditLog.filter(a => a.action === 'Updated').length }}</div>
        <div class="text-xs text-gray-500 mt-1">Updated</div>
      </Card>
      <Card class="text-center p-4">
        <div class="text-2xl font-bold text-[#dc2626]">{{ SAMPLES.auditLog.filter(a => a.action !== 'Created').length }}</div>
        <div class="text-xs text-gray-500 mt-1">Modified</div>
      </Card>
    </div>

    <Card>
      <SectionLabel>ប្រវត្តិ Audit</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-gray-100"><th class="text-left text-xs font-semibold text-gray-500 pb-3">កាលបរិច្ឆេទ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">អ្នកប្រើ</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">Module</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">លេខយោង</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">Action</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">Old</th><th class="text-left text-xs font-semibold text-gray-500 pb-3">New</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="a in SAMPLES.auditLog" :key="a.refNo + a.date" class="hover:bg-gray-50">
              <td class="py-3 pr-3"><div class="font-mono text-xs text-gray-600">{{ a.date }}</div></td>
              <td class="py-3 pr-3 font-medium text-gray-800">{{ a.user }}</td>
              <td class="py-3 pr-3"><span class="bg-[#e8eef5] text-[#0f2a4a] px-2 py-0.5 rounded-full text-xs font-semibold">{{ a.module }}</span></td>
              <td class="py-3 pr-3 font-mono text-xs text-gray-600">{{ a.refNo }}</td>
              <td class="py-3 pr-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="a.action === 'Created' ? 'bg-[#dcfce7] text-[#15803d]' : a.action === 'Updated' ? 'bg-[#fff7ed] text-[#c2410c]' : 'bg-[#f1f5f9] text-[#64748b]'">
                  {{ a.action }}
                </span>
              </td>
              <td class="py-3 pr-3 text-xs text-gray-500">{{ a.oldVal }}</td>
              <td class="py-3 text-xs font-semibold text-gray-700">{{ a.newVal }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <div v-if="!VALID_TYPES.includes(type)" class="max-w-3xl mx-auto">
    <PageHeader title="មិនស្គាល់" :onBack="() => router.push('/reports')" />
    <EmptyState>របាយការណ៍នេះមិនមានទេ</EmptyState>
  </div>
</template>
