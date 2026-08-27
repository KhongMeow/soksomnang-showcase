<script setup lang="ts">
import type { Branch, Product, Supplier, Client } from "~/utils/data"
import { useSwal } from "~/composables/useSwal"

definePageMeta({ middleware: ["auth", "admin"] })

const router = useRouter()
const api = useApi()
const { alertSuccess, alertError, showToast } = useSwal()
const activeSection = ref<string | null>(null)

const CATEGORIES = [
  { id: "branch", label: "សាខា", icon: resolveComponent("IconTransfer"), color: "#0f2a4a", desc: "Branch Management" },
  { id: "product", label: "ផលិតផល", icon: resolveComponent("IconStock"), color: "#16a34a", desc: "Product Management" },
  { id: "unit", label: "ឯកតា", icon: resolveComponent("IconSettings"), color: "#7c3aed", desc: "Unit Configuration" },
  { id: "price", label: "តម្លៃ", icon: resolveComponent("IconReport"), color: "#ea580c", desc: "Price Configuration" },
  { id: "client", label: "Client", icon: resolveComponent("IconDebt"), color: "#dc2626", desc: "Client Management" },
  { id: "supplier", label: "Supplier", icon: resolveComponent("IconSupplier"), color: "#1a4a7a", desc: "Supplier Management" },
  { id: "expense-cat", label: "ប្រភេទចំណាយ", icon: resolveComponent("IconExpense"), color: "#0097a7", desc: "Expense Categories" },
  { id: "user", label: "User & Permission", icon: resolveComponent("IconHome"), color: "#6d28d9", desc: "User Management" },
]

/* ── Branch Management ── */
interface BranchEntry extends Branch { active: boolean }
const branches = ref<BranchEntry[]>([])
const showAddBranch = ref(false)
const newBranchName = ref("")

async function loadBranches() {
  branches.value = await api.get<BranchEntry[]>("/branches")
}

async function toggleBranchActive(id: string) {
  const b = branches.value.find((x) => x.id === id)
  if (!b) return
  b.active = !b.active
  try {
    await api.patch(`/branches/${id}`, { active: b.active })
  } catch {
    b.active = !b.active
  }
}

async function addBranch() {
  const name = newBranchName.value.trim()
  if (!name) return
  await api.post("/branches", { name })
  newBranchName.value = ""
  showAddBranch.value = false
  await loadBranches()
}

/* ── Product Management ── */
const products = ref<Product[]>([])
const showAddProduct = ref(false)
const newProductName = ref("")
const newProductPrice = ref("")
const editingProduct = ref<string | null>(null)
const editProductName = ref("")
const editProductPrice = ref("")

async function loadProducts() {
  products.value = await api.get<Product[]>("/products")
}

async function addProduct() {
  const name = newProductName.value.trim()
  const price = parseFloat(newProductPrice.value)
  if (!name || isNaN(price)) return
  await api.post("/products", { name, defaultPrice: price })
  newProductName.value = ""
  newProductPrice.value = ""
  showAddProduct.value = false
  await loadProducts()
}

function startEditProduct(p: Product) {
  editingProduct.value = p.id
  editProductName.value = p.name
  editProductPrice.value = String(p.defaultPrice)
}

async function saveEditProduct(id: string) {
  const p = products.value.find((x) => x.id === id)
  if (!p) return
  const name = editProductName.value.trim() || p.name
  const price = parseFloat(editProductPrice.value)
  await api.patch(`/products/${id}`, {
    name,
    ...(!isNaN(price) ? { defaultPrice: price } : {}),
  })
  editingProduct.value = null
  await loadProducts()
}

function cancelEditProduct() {
  editingProduct.value = null
}

async function deleteProduct(id: string) {
  await api.del(`/products/${id}`)
  await loadProducts()
}

/* ── Unit Configuration ── */
const UNITS = ["taka", "head", "kg"]
const { kgPerTaka, headsPerTaka, load: loadSettings } = useSettings()

async function saveSettings() {
  await api.patch("/settings", {
    kgPerTaka: kgPerTaka.value,
    headsPerTaka: headsPerTaka.value,
    expenseCategories: expenseCategories.value,
  })
}

/* ── Price Configuration (Daily Flexible Board with History) ── */
const priceMatrix = ref<any[]>([])
const selectedPriceDate = ref(new Date().toISOString().slice(0, 10))
const selectedPriceBranch = ref("all")
const savingPrices = ref(false)

async function loadPrices(date?: string) {
  const target = date || selectedPriceDate.value
  selectedPriceDate.value = target
  try {
    const rows = await api.get<any[]>(`/settings/prices?date=${target}`)
    priceMatrix.value = rows.map((r) => ({
      productId: r.product?.id ?? r.productId,
      productName: r.product?.name ?? r.productName,
      branchId: r.branch?.id ?? r.branchId,
      branchName: r.branch?.name ?? r.branchName,
      costPrice: r.costPrice ?? 0,
      sellingPrice: r.sellingPrice ?? 0,
      clientSpecialPrice: r.clientSpecialPrice ?? 0,
    }))
  } catch (err) {
    console.error("Error loading prices for date:", target, err)
  }
}

async function copyYesterdayPrices() {
  const d = new Date(selectedPriceDate.value)
  d.setDate(d.getDate() - 1)
  const yesterdayStr = d.toISOString().slice(0, 10)
  try {
    const yesterdayRows = await api.get<any[]>(`/settings/prices?date=${yesterdayStr}`)
    if (yesterdayRows && yesterdayRows.length > 0) {
      yesterdayRows.forEach((yr: any) => {
        const yProdId = yr.product?.id ?? yr.productId
        const yBranchId = yr.branch?.id ?? yr.branchId
        const target = priceMatrix.value.find(
          (m) => m.productId === yProdId && m.branchId === yBranchId
        )
        if (target) {
          target.sellingPrice = yr.sellingPrice ?? target.sellingPrice
          target.clientSpecialPrice = yr.clientSpecialPrice ?? target.clientSpecialPrice
          target.costPrice = yr.costPrice ?? target.costPrice
        }
      })
      showToast(`បានចម្លងតម្លៃពីថ្ងៃទី ${yesterdayStr} រួចរាល់`, "success")
    } else {
      alertError("ពុំមានទិន្នន័យ", `ពុំមានទិន្នន័យតម្លៃសម្រាប់ថ្ងៃទី ${yesterdayStr} ទេ`)
    }
  } catch (e: any) {
    alertError("បរាជ័យ", "មិនអាចទាញយកតម្លៃថ្ងៃម្សិលមិញបានទេ")
  }
}

const filteredPriceMatrix = computed(() => {
  if (selectedPriceBranch.value === "all") return priceMatrix.value
  return priceMatrix.value.filter((r) => r.branchId === selectedPriceBranch.value || r.branchName === selectedPriceBranch.value)
})

async function savePrices() {
  if (savingPrices.value) return
  savingPrices.value = true
  try {
    await api.put("/settings/prices", {
      date: selectedPriceDate.value,
      rows: priceMatrix.value.map((r) => ({
        productId: r.productId,
        branchId: r.branchId,
        costPrice: r.costPrice,
        sellingPrice: r.sellingPrice,
        clientSpecialPrice: r.clientSpecialPrice,
      })),
    })
    alertSuccess("ជោគជ័យ", `បានរក្សាទុកតម្លៃលក់សម្រាប់ថ្ងៃទី ${selectedPriceDate.value} ដោយជោគជ័យ!`)
  } catch (e: any) {
    alertError("បរាជ័យ", e?.data?.message || "មិនអាចរក្សាទុកតម្លៃបានទេ")
  } finally {
    savingPrices.value = false
  }
}

/* ── Expense Categories ── */
const expenseCategories = ref<string[]>([])
const newCategoryName = ref("")
const showAddCategory = ref(false)

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name || expenseCategories.value.includes(name)) return
  expenseCategories.value.push(name)
  newCategoryName.value = ""
  showAddCategory.value = false
  await saveSettings()
}

async function removeCategory(index: number) {
  expenseCategories.value.splice(index, 1)
  await saveSettings()
}

/* ── User & Permission ── */
interface UserPermission {
  label: string
  key: string
}

interface UserEntry {
  id: string
  name: string
  role: string
  permissions: Record<string, boolean>
}

const PERMISSION_DEFS: UserPermission[] = [
  { key: "create_sale", label: "បង្កើតការលក់" },
  { key: "edit_price", label: "កែតម្លៃ" },
  { key: "receive_payment", label: "ទទួលទឹកប្រាក់" },
  { key: "view_cost", label: "មើលថ្លៃដើម" },
  { key: "view_profit", label: "មើលចំណេញ" },
  { key: "adjust_stock", label: "កែស្តុក" },
  { key: "transfer_stock", label: "ផ្ទេរស្តុក" },
  { key: "view_reports", label: "មើលរបាយការណ៍" },
  { key: "manage_settings", label: "គ្រប់គ្រងការកំណត់" },
  { key: "cancel_transaction", label: "បោះបង់ប្រតិ" },
]

const users = ref<UserEntry[]>([])

async function loadUsers() {
  users.value = await api.get<UserEntry[]>("/users")
}

async function togglePermission(userId: string, permKey: string) {
  const u = users.value.find((x) => x.id === userId)
  if (!u) return
  u.permissions[permKey] = !u.permissions[permKey]
  try {
    await api.patch(`/users/${userId}`, { permissions: u.permissions })
  } catch {
    u.permissions[permKey] = !u.permissions[permKey]
  }
}

/* ── Clients / Suppliers tables ── */
const CLIENTS = ref<Client[]>([])
const SUPPLIERS = ref<Supplier[]>([])

onMounted(async () => {
  try {
    await Promise.all([loadBranches(), loadProducts(), loadPrices(), loadUsers(), loadSettings()])
    CLIENTS.value = await api.get<Client[]>("/clients")
    SUPPLIERS.value = await api.get<Supplier[]>("/suppliers")
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <!-- ============================================================ -->
  <!-- SETTINGS HUB -->
  <!-- ============================================================ -->
  <div v-if="!activeSection" class="max-w-5xl mx-auto">
    <div class="mb-6">
      <h1 class="text-xl font-bold text-[#0f2a4a]">ការកំណត់</h1>
      <p class="text-sm text-gray-500 mt-0.5">Settings · គ្រប់គ្រងការកំណត់ប្រព័ន្ធ</p>
    </div>

    <SectionLabel>ប្រភេទ</SectionLabel>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        v-for="c in CATEGORIES"
        :key="c.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-gray-200 transition-all group"
        @click="activeSection = c.id"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            :style="{ backgroundColor: `${c.color}15`, color: c.color }">
            <component :is="c.icon" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm text-gray-800 group-hover:text-[#0f2a4a] truncate">{{ c.label }}</div>
            <div class="text-xs text-gray-400 truncate">{{ c.desc }}</div>
          </div>
        </div>
      </button>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- BRANCH MANAGEMENT -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'branch'" class="max-w-5xl mx-auto">
    <PageHeader title="សាខា" :on-back="() => activeSection = null" />

    <Card>
      <div class="flex items-center justify-between mb-4">
        <SectionLabel>បញ្ជីសាខា</SectionLabel>
        <button
          @click="showAddBranch = !showAddBranch"
          class="px-4 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-colors"
        >
          + បន្ថែមសាខា
        </button>
      </div>

      <div v-if="showAddBranch" class="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ឈ្មោះសាខា</label>
            <input
              v-model="newBranchName"
              placeholder="បញ្ចូលឈ្មោះសាខាថ្មី"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-base outline-none focus:border-[#00b4c8]"
              @keyup.enter="addBranch"
            />
          </div>
          <button
            @click="addBranch"
            class="px-5 py-3 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors"
          >
            រក្សាទុក
          </button>
          <button
            @click="showAddBranch = false"
            class="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            បោះបង់
          </button>
        </div>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="text-left text-xs font-semibold text-gray-500 pb-3">ឈ្មោះសាខា</th>
            <th class="text-center text-xs font-semibold text-gray-500 pb-3">ស្ថានភាព</th>
            <th class="text-center text-xs font-semibold text-gray-500 pb-3">សកម្ម</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="b in branches" :key="b.id" class="hover:bg-gray-50">
            <td class="py-3 pr-3 font-medium text-gray-800">{{ b.name }}</td>
            <td class="py-3 text-center">
              <StatusBadge :status="b.active ? 'paid' : 'credit'" />
            </td>
            <td class="py-3 text-center">
              <button
                @click="toggleBranchActive(b.id)"
                class="relative w-12 h-7 rounded-full transition-colors"
                :class="b.active ? 'bg-[#16a34a]' : 'bg-gray-300'"
              >
                <span class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                  :class="b.active ? 'translate-x-5' : ''" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- PRODUCT MANAGEMENT -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'product'" class="max-w-5xl mx-auto">
    <PageHeader title="ផលិតផល" :on-back="() => activeSection = null">
      <template #right>
        <button
          @click="showAddProduct = !showAddProduct"
          class="px-4 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-colors"
        >
          + បន្ថែមផលិតផល
        </button>
      </template>
    </PageHeader>

    <div v-if="showAddProduct" class="bg-gray-50 rounded-2xl p-5 mb-5 border border-gray-200">
      <h3 class="font-bold text-gray-800 mb-3">ផលិតផលថ្មី</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">ឈ្មោះ</label>
          <input
            v-model="newProductName"
            placeholder="ឈ្មោះផលិតផល"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-base outline-none focus:border-[#00b4c8]"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">តម្លៃលំនាំដើម ($)</label>
          <input
            v-model="newProductPrice"
            type="number"
            placeholder="0.00"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-base outline-none focus:border-[#00b4c8]"
          />
        </div>
      </div>
      <div class="flex gap-3">
        <button
          @click="addProduct"
          class="px-5 py-2.5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors"
        >
          រក្សាទុក
        </button>
        <button
          @click="showAddProduct = false"
          class="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          បោះបង់
        </button>
      </div>
    </div>

    <Card>
      <SectionLabel>បញ្ជីផលិតផល</SectionLabel>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="text-left text-xs font-semibold text-gray-500 pb-3">ឈ្មោះ</th>
            <th class="text-right text-xs font-semibold text-gray-500 pb-3">តម្លៃលំនាំដើម</th>
            <th class="text-center text-xs font-semibold text-gray-500 pb-3">សកម្មភាព</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in products" :key="p.id" class="hover:bg-gray-50">
            <td class="py-3 pr-3">
              <template v-if="editingProduct === p.id">
                <input
                  v-model="editProductName"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00b4c8]"
                />
              </template>
              <span v-else class="font-medium text-gray-800">{{ p.name }}</span>
            </td>
            <td class="py-3 text-right">
              <template v-if="editingProduct === p.id">
                <input
                  v-model="editProductPrice"
                  type="number"
                  class="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm text-right outline-none focus:border-[#00b4c8]"
                />
              </template>
              <span v-else class="font-semibold text-[#0f2a4a]">${{ p.defaultPrice }}</span>
            </td>
            <td class="py-3 text-center">
              <template v-if="editingProduct === p.id">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="saveEditProduct(p.id)"
                    class="px-3 py-1.5 rounded-lg bg-[#16a34a] text-white text-xs font-semibold hover:bg-[#15803d]"
                  >
                    រក្សាទុក
                  </button>
                  <button
                    @click="cancelEditProduct"
                    class="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-300"
                  >
                    បោះបង់
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="startEditProduct(p)"
                    class="px-3 py-1.5 rounded-lg bg-[#e0f9fb] text-[#0097a7] text-xs font-semibold hover:bg-[#c5f2f7]"
                  >
                    កែ
                  </button>
                  <button
                    @click="deleteProduct(p.id)"
                    class="px-3 py-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] text-xs font-semibold hover:bg-[#fde8e8]"
                  >
                    លុប
                  </button>
                </div>
              </template>
            </td>
          </tr>
          <tr v-if="products.length === 0">
            <td colspan="3" class="py-8 text-center text-gray-400 text-sm">គ្មានផលិតផល</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- UNIT CONFIGURATION -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'unit'" class="max-w-5xl mx-auto">
    <PageHeader title="ឯកតា" :on-back="() => activeSection = null" />

    <Card class="mb-5">
      <SectionLabel>ប្រភេទឯកតា</SectionLabel>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          v-for="u in UNITS"
          :key="u"
          class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center"
        >
          <div class="text-lg font-bold text-[#0f2a4a]">{{ u === "taka" ? "តាការ" : u === "head" ? "ក្បាល" : "គីឡូ" }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ u }}</div>
        </div>
      </div>
    </Card>

    <Card>
      <SectionLabel>ការកំណត់</SectionLabel>
      <div class="max-w-md">
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">
          គីឡូក្នុងមួយតាការ
        </label>
        <div class="flex items-center gap-3">
          <input
            v-model.number="kgPerTaka"
            type="number"
            min="1"
            class="w-32 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-base text-center font-bold text-[#0f2a4a] outline-none focus:border-[#00b4c8]"
          />
          <span class="text-sm text-gray-500">គីឡូ</span>
        </div>
        <p class="mt-1 text-xs text-gray-400">1 តាការ = {{ kgPerTaka }} គីឡូ</p>
      </div>

      <div class="mt-4 bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-4 py-3 flex items-start gap-2">
        <IconWarning class="flex-shrink-0 mt-0.5 text-[#ea580c]" />
        <p class="text-sm text-[#c2410c]">
          ការផ្លាស់ប្ដូរនេះនឹងអនុវត្តសម្រាប់តែប្រតិបត្តិការថ្មីប៉ុណ្ណោះ។ ប្រតិបត្តិការដែលមានស្រាប់នឹងមិនត្រូវបានប៉ះពាល់ឡើយ។
        </p>
      </div>

      <button
        @click="saveSettings"
        class="mt-4 px-6 py-3 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-colors"
      >
        រក្សាទុកការកំណត់
      </button>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- PRICE CONFIGURATION -->
  <!-- ============================================================ -->
  <!-- ============================================================ -->
  <!-- PRICE CONFIGURATION (Daily Flexible Board with History) -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'price'" class="max-w-5xl mx-auto space-y-4">
    <PageHeader title="កំណត់តម្លៃលក់ប្រចាំថ្ងៃ (Daily Flexible Selling Prices)" :on-back="() => activeSection = null" />

    <!-- Date & History Toolbar Card -->
    <Card class="bg-white border border-slate-200 shadow-xs">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>📅</span>
            <span>ជ្រើសរើសថ្ងៃកំណត់តម្លៃ ឬមើលប្រវត្តិ (Date & History)</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            តម្លៃប្រែប្រួលជារៀងរាល់ថ្ងៃដូចប្រេងសាំង (Flexible daily prices per date)
          </p>
        </div>

        <!-- Date Picker Controls -->
        <div class="flex items-center gap-2 flex-wrap">
          <input
            v-model="selectedPriceDate"
            type="date"
            @change="loadPrices(selectedPriceDate)"
            class="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-[#00b4c8] bg-slate-50 cursor-pointer"
          />

          <button
            @click="loadPrices(new Date().toISOString().slice(0, 10))"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            :class="selectedPriceDate === new Date().toISOString().slice(0, 10) ? 'bg-[#0f2a4a] text-white border-[#0f2a4a]' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'"
          >
            ថ្ងៃនេះ
          </button>

          <button
            @click="(() => { const d = new Date(); d.setDate(d.getDate() - 1); loadPrices(d.toISOString().slice(0, 10)); })()"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            :class="selectedPriceDate === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })() ? 'bg-[#0f2a4a] text-white border-[#0f2a4a]' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'"
          >
            ម្សិលមិញ
          </button>
        </div>
      </div>

      <!-- Secondary Bar: Branch Filter & Copy Action -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
        <!-- Branch Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            @click="selectedPriceBranch = 'all'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
            :class="selectedPriceBranch === 'all' ? 'bg-cyan-50 text-cyan-800 border border-cyan-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
          >
            គ្រប់សាខាទាំងអស់
          </button>
          <button
            v-for="b in branches"
            :key="b.id"
            @click="selectedPriceBranch = b.id"
            class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
            :class="selectedPriceBranch === b.id ? 'bg-cyan-50 text-cyan-800 border border-cyan-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'"
          >
            🏬 {{ b.name }}
          </button>
        </div>

        <!-- Quick Copy Action -->
        <button
          @click="copyYesterdayPrices"
          class="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
          title="ចម្លងតម្លៃពីថ្ងៃម្សិលមិញមកដាក់ថ្ងៃនេះ"
        >
          <span>📋</span>
          <span>ចម្លងតម្លៃពីម្សិលមិញ</span>
        </button>
      </div>
    </Card>

    <!-- Price Matrix Table Card -->
    <Card class="bg-white border border-slate-200 shadow-xs">
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <SectionLabel class="!mb-0">
            តារាងតម្លៃប្រចាំថ្ងៃ៖ <span class="text-[#00b4c8]">{{ selectedPriceDate }}</span>
          </SectionLabel>
          <span
            v-if="selectedPriceDate === new Date().toISOString().slice(0, 10)"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            🟢 តម្លៃថ្ងៃនេះ (Active Today)
          </span>
          <span
            v-else
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
          >
            📜 ប្រវត្តិតម្លៃអតីតកាល
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th class="text-left text-xs font-bold py-2.5 px-3">ផលិតផល</th>
              <th class="text-left text-xs font-bold py-2.5 px-3">សាខា</th>
              <th class="text-right text-xs font-bold py-2.5 px-3">តម្លៃដើម ($/kg)</th>
              <th class="text-right text-xs font-bold py-2.5 px-3">តម្លៃលក់ទូទៅ ($/kg) *</th>
              <th class="text-right text-xs font-bold py-2.5 px-3">តម្លៃម៉ូយ VIP ($/kg) *</th>
              <th class="text-right text-xs font-bold py-2.5 px-3">ផលចំណេញ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="row in filteredPriceMatrix"
              :key="`${row.productId}-${row.branchId}`"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="py-2.5 px-3 font-bold text-slate-800">
                🐔 {{ row.productName }}
              </td>
              <td class="py-2.5 px-3 text-xs text-slate-600">
                🏬 {{ row.branchName }}
              </td>
              <td class="py-2.5 px-3 text-right">
                <input
                  v-model.number="row.costPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-right font-semibold text-slate-600 outline-none focus:border-[#00b4c8] bg-slate-50"
                />
              </td>
              <td class="py-2.5 px-3 text-right">
                <input
                  v-model.number="row.sellingPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-28 px-2.5 py-1.5 rounded-xl border border-slate-300 text-sm text-right font-black text-[#0f2a4a] outline-none focus:border-[#00b4c8] bg-white shadow-2xs"
                />
              </td>
              <td class="py-2.5 px-3 text-right">
                <input
                  v-model.number="row.clientSpecialPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-28 px-2.5 py-1.5 rounded-xl border border-purple-200 text-sm text-right font-black text-purple-700 outline-none focus:border-purple-500 bg-purple-50/40 shadow-2xs"
                />
              </td>
              <td class="py-2.5 px-3 text-right text-xs font-bold">
                <span
                  :class="row.sellingPrice - (row.costPrice || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'"
                >
                  +${{ (row.sellingPrice - (row.costPrice || 0)).toFixed(2) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save Button -->
      <div class="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
        <span class="text-xs text-slate-500">
          តម្លៃនឹងត្រូវបានរក្សាទុកសម្រាប់កាលបរិច្ឆេទ <strong>{{ selectedPriceDate }}</strong>
        </span>
        <button
          @click="savePrices"
          :disabled="savingPrices"
          class="px-6 py-2.5 rounded-xl bg-[#0f2a4a] hover:bg-[#1a4a7a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span v-if="savingPrices" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span v-else>💾 រក្សាទុកតម្លៃថ្ងៃទី {{ selectedPriceDate }}</span>
        </button>
      </div>
    </Card>
  </div>
  <div v-if="activeSection === 'client'" class="max-w-5xl mx-auto">
    <PageHeader title="Client" :on-back="() => activeSection = null" />

    <Card>
      <SectionLabel>បញ្ជី Client</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left text-xs font-semibold text-gray-500 pb-3">ឈ្មោះ</th>
              <th class="text-left text-xs font-semibold text-gray-500 pb-3">ទូរស័ព្ទ</th>
              <th class="text-right text-xs font-semibold text-gray-500 pb-3">ជំពាក់</th>
              <th class="text-left text-xs font-semibold text-gray-500 pb-3">បង់ចុងក្រោយ</th>
              <th class="text-center text-xs font-semibold text-gray-500 pb-3">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in CLIENTS" :key="c.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ c.name }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ c.phone }}</td>
              <td class="py-3 text-right font-bold" :class="c.debt > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'">
                {{ c.debt > 0 ? `$${c.debt.toLocaleString()}` : '—' }}
              </td>
              <td class="py-3 pr-3 text-gray-600">{{ c.lastPayment || '—' }}</td>
              <td class="py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    class="px-3 py-1.5 rounded-lg bg-[#e0f9fb] text-[#0097a7] text-xs font-semibold hover:bg-[#c5f2f7]"
                  >
                    មើល
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] text-xs font-semibold hover:bg-[#fde8e8]"
                  >
                    កែ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-100">
              <td class="pt-3 text-sm font-bold text-gray-700">សរុប</td>
              <td />
              <td class="pt-3 text-right font-bold text-[#dc2626]">${{ CLIENTS.reduce((a, c) => a + c.debt, 0).toLocaleString() }}</td>
              <td colspan="2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- SUPPLIER MANAGEMENT -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'supplier'" class="max-w-5xl mx-auto">
    <PageHeader title="Supplier" :on-back="() => activeSection = null" />

    <Card>
      <SectionLabel>បញ្ជី Supplier</SectionLabel>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left text-xs font-semibold text-gray-500 pb-3">ឈ្មោះ</th>
              <th class="text-left text-xs font-semibold text-gray-500 pb-3">ទូរស័ព្ទ</th>
              <th class="text-right text-xs font-semibold text-gray-500 pb-3">ជំពាក់</th>
              <th class="text-right text-xs font-semibold text-gray-500 pb-3">ទិញសរុប</th>
              <th class="text-center text-xs font-semibold text-gray-500 pb-3">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in SUPPLIERS" :key="s.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3 font-medium text-gray-800">{{ s.name }}</td>
              <td class="py-3 pr-3 text-gray-600">{{ s.phone }}</td>
              <td class="py-3 text-right font-bold" :class="s.debt > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'">
                {{ s.debt > 0 ? `$${s.debt.toLocaleString()}` : '—' }}
              </td>
              <td class="py-3 text-right font-semibold text-[#0f2a4a]">${{ s.totalPurchase.toLocaleString() }}</td>
              <td class="py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    class="px-3 py-1.5 rounded-lg bg-[#e0f9fb] text-[#0097a7] text-xs font-semibold hover:bg-[#c5f2f7]"
                  >
                    មើល
                  </button>
                  <button
                    class="px-3 py-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] text-xs font-semibold hover:bg-[#fde8e8]"
                  >
                    កែ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-100">
              <td class="pt-3 text-sm font-bold text-gray-700">សរុប</td>
              <td />
              <td class="pt-3 text-right font-bold text-[#dc2626]">${{ SUPPLIERS.reduce((a, s) => a + s.debt, 0).toLocaleString() }}</td>
              <td class="pt-3 text-right font-bold text-[#0f2a4a]">${{ SUPPLIERS.reduce((a, s) => a + s.totalPurchase, 0).toLocaleString() }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- EXPENSE CATEGORIES -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'expense-cat'" class="max-w-5xl mx-auto">
    <PageHeader title="ប្រភេទចំណាយ" :on-back="() => activeSection = null">
      <template #right>
        <button
          @click="showAddCategory = !showAddCategory"
          class="px-4 py-2 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-colors"
        >
          + បន្ថែម
        </button>
      </template>
    </PageHeader>

    <div v-if="showAddCategory" class="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-200">
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">ឈ្មោះប្រភេទ</label>
          <input
            v-model="newCategoryName"
            placeholder="បញ្ចូលប្រភេទថ្មី"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-base outline-none focus:border-[#00b4c8]"
            @keyup.enter="addCategory"
          />
        </div>
        <button
          @click="addCategory"
          class="px-5 py-3 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors"
        >
          រក្សាទុក
        </button>
        <button
          @click="showAddCategory = false"
          class="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          បោះបង់
        </button>
      </div>
    </div>

    <Card>
      <SectionLabel>បញ្ជីប្រភេទចំណាយ ({{ expenseCategories.length }})</SectionLabel>
      <div class="space-y-2">
        <div
          v-for="(cat, i) in expenseCategories"
          :key="i"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-[#0097a7]/10 text-[#0097a7] flex items-center justify-center text-sm font-bold">
              {{ i + 1 }}
            </span>
            <span class="font-medium text-gray-800">{{ cat }}</span>
          </div>
          <button
            @click="removeCategory(i)"
            class="px-3 py-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] text-xs font-semibold hover:bg-[#fde8e8] transition-colors"
          >
            លុប
          </button>
        </div>
        <div v-if="expenseCategories.length === 0" class="py-8 text-center text-gray-400 text-sm">
          គ្មានប្រភេទចំណាយ
        </div>
      </div>
    </Card>
  </div>

  <!-- ============================================================ -->
  <!-- USER & PERMISSION -->
  <!-- ============================================================ -->
  <div v-if="activeSection === 'user'" class="max-w-5xl mx-auto">
    <PageHeader title="User & Permission" :on-back="() => activeSection = null" />

    <Card class="mb-5" v-for="u in users" :key="u.id">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-gray-800">{{ u.name }}</h3>
          <p class="text-xs text-gray-400">
            {{ u.role === "admin" ? "អ្នកគ្រប់គ្រង" : "បុគ្គលិកលក់" }}
          </p>
        </div>
        <StatusBadge :status="u.role === 'admin' ? 'paid' : 'partial'" :size="'md'" />
      </div>

      <SectionLabel>ការអនុញ្ញាត</SectionLabel>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          v-for="p in PERMISSION_DEFS"
          :key="p.key"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="u.permissions[p.key]"
            @change="togglePermission(u.id, p.key)"
            class="w-5 h-5 rounded-lg border-2 border-gray-300 text-[#00b4c8] focus:ring-[#00b4c8] accent-[#00b4c8] cursor-pointer"
          />
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-700">{{ p.label }}</span>
            <span class="text-xs text-gray-400 ml-2">{{ p.key }}</span>
          </div>
        </label>
      </div>
    </Card>
  </div>
</template>
