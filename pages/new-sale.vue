<script setup lang="ts">
import type { PayStatus, Branch, Product, Client } from "~/utils/data"
import { useSwal } from "~/composables/useSwal"

definePageMeta({ middleware: "auth" })

const { role, user } = useAuth()
const router = useRouter()
const api = useApi()
const { load: loadSettings } = useSettings()
const { confirmAsk, alertSuccess, alertWarning, alertError, showToast } = useSwal()

// ── Master State ──
const branches = ref<Branch[]>([])
const products = ref<Product[]>([])
const clients = ref<Client[]>([])
const priceMatrix = ref<any[]>([])
const selectedBranch = ref("")

// POS Cart Item Structure (Sold by Heads, calculated by Weight in Kg)
export interface PosItem {
  id: string
  productId: string
  productName: string
  heads: string // ចំនួនក្បាល
  weightKg: string // ទម្ងន់គីឡូ (Kg)
  priceKg: string // តម្លៃ/គីឡូ ($)
  isCustomPrice: boolean
  memorizedPrice?: number
}

// ── Multi-Customer Active Orders System ──
export interface CustomerOrder {
  id: string
  orderNumber: number
  clientId: string
  clientName: string
  useSpecialPrice: boolean
  cart: PosItem[]
  payStatus: PayStatus
  payMethod: "cash" | "bank"
  amountPaid: string
  note: string
  createdAt: number
}

let orderCounter = 1

function createEmptyOrder(num?: number): CustomerOrder {
  const currentNum = num ?? ++orderCounter
  return {
    id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    orderNumber: currentNum,
    clientId: "",
    clientName: "",
    useSpecialPrice: false,
    cart: [],
    payStatus: "paid",
    payMethod: "cash",
    amountPaid: "",
    note: "",
    createdAt: Date.now(),
  }
}

const activeOrders = ref<CustomerOrder[]>([createEmptyOrder(1)])
const activeOrderId = ref<string>(activeOrders.value[0].id)

const currentOrder = computed<CustomerOrder>(() => {
  const found = activeOrders.value.find((o) => o.id === activeOrderId.value)
  return found || activeOrders.value[0]
})

// Quick Access to Current Order Properties
const cart = computed<PosItem[]>({
  get: () => currentOrder.value.cart,
  set: (val) => {
    currentOrder.value.cart = val
  },
})

const selectedClientId = computed<string>({
  get: () => currentOrder.value.clientId,
  set: (val) => {
    currentOrder.value.clientId = val
  },
})

const selectedClientName = computed<string>({
  get: () => currentOrder.value.clientName,
  set: (val) => {
    currentOrder.value.clientName = val
  },
})

const useSpecialPrice = computed<boolean>({
  get: () => currentOrder.value.useSpecialPrice,
  set: (val) => {
    currentOrder.value.useSpecialPrice = val
  },
})

const payStatus = computed<PayStatus>({
  get: () => currentOrder.value.payStatus,
  set: (val) => {
    currentOrder.value.payStatus = val
  },
})

const payMethod = computed<"cash" | "bank">({
  get: () => currentOrder.value.payMethod,
  set: (val) => {
    currentOrder.value.payMethod = val
  },
})

const amountPaid = computed<string>({
  get: () => currentOrder.value.amountPaid,
  set: (val) => {
    currentOrder.value.amountPaid = val
  },
})

const note = computed<string>({
  get: () => currentOrder.value.note,
  set: (val) => {
    currentOrder.value.note = val
  },
})

// ── Multi-Customer Order Actions ──
function addNewCustomerOrder() {
  const newOrder = createEmptyOrder()
  activeOrders.value.push(newOrder)
  activeOrderId.value = newOrder.id
  mobileCartOpen.value = false
}

function switchOrder(orderId: string) {
  activeOrderId.value = orderId
}

async function removeOrder(orderId: string) {
  const idx = activeOrders.value.findIndex((o) => o.id === orderId)
  if (idx === -1) return

  const target = activeOrders.value[idx]
  if (target.cart.length > 0) {
    const ok = await confirmAsk({
      title: "បញ្ជាក់ការលុបការលក់",
      text: `តើអ្នកពិតជាចង់លុបការលក់សម្រាប់ "${target.clientName || 'អតិថិជន #' + target.orderNumber}" ដែលមានទំនិញ ${target.cart.length} មុខមែនទេ?`,
      icon: "warning",
      confirmText: "លុបចោល",
      cancelText: "ត្រឡប់ក្រោយ",
      danger: true,
    })
    if (!ok) return
  }

  activeOrders.value.splice(idx, 1)
  if (activeOrders.value.length === 0) {
    const newOrd = createEmptyOrder()
    activeOrders.value.push(newOrd)
    activeOrderId.value = newOrd.id
  } else if (activeOrderId.value === orderId) {
    activeOrderId.value = activeOrders.value[Math.max(0, idx - 1)].id
  }
  showToast("បានលុបការលក់រួចរាល់", "success")
}

function holdCurrentOrder() {
  if (cart.value.length === 0) {
    alertWarning("មិនទាន់មានទំនិញ", "សូមបន្ថែមទំនិញចូលក្នុងកន្ត្រកជាមុនសិន មុននឹងផ្អាកទុក!")
    return
  }
  addNewCustomerOrder()
  showToast("បានផ្អាកការលក់ និងបើកផ្ទាំងថ្មី", "info")
}

// Search & UI Mode
const searchQuery = ref("")
const mobileCartOpen = ref(false)
const isSaving = ref(false)

// Modals
const showReceipt = ref(false)
const lastCompletedSale = ref<any>(null)

const showAddClientModal = ref(false)
const isCreatingClient = ref(false)
const newClientForm = reactive({
  name: "",
  phone: "",
  isSpecial: false,
})

// Numpad Modal
const numpadOpen = ref(false)
const numpadTargetItemIndex = ref<number | null>(null)
const numpadTargetField = ref<string>("")
const numpadValue = ref("")
const numpadLabel = ref("")

// ── Lifecycle & Data Loading ──
onMounted(async () => {
  try {
    const [b, p, c, pm] = await Promise.all([
      api.get<Branch[]>("/branches").catch(() => []),
      api.get<Product[]>("/products").catch(() => []),
      api.get<Client[]>("/clients").catch(() => []),
      api.get<any[]>("/settings/prices").catch(() => []),
    ])
    branches.value = Array.isArray(b) ? b : []
    products.value = Array.isArray(p) ? p : []
    clients.value = Array.isArray(c) ? c : []
    priceMatrix.value = Array.isArray(pm) ? pm : []

    if (user.value?.branchId) {
      const match = branches.value.find((x) => x.id === user.value?.branchId || x.name === user.value?.branchId)
      if (match) selectedBranch.value = match.id
      else if (branches.value.length) selectedBranch.value = branches.value[0].id
    } else if (branches.value.length) {
      selectedBranch.value = branches.value[0].id
    }
  } catch (e) {
    console.error("Error loading POS data:", e)
  }
  loadSettings()
})

// ── Computed Helpers ──
const selectedClient = computed(() => clients.value.find((c) => c.id === selectedClientId.value || c.name === selectedClientName.value))

const filteredClients = computed(() => {
  const brId = selectedBranch.value
  const branchObj = branches.value.find((b) => b.id === brId)
  const brName = branchObj?.name || brId

  return clients.value.filter((c) => {
    if (c.branchId) {
      return c.branchId === brId || c.branchId === brName
    }
    if (c.branch) {
      return c.branch === brId || c.branch === brName
    }
    return false
  })
})

const clientOptions = computed(() =>
  filteredClients.value.map((c) => ({
    id: c.id,
    label: c.name,
    sub: [c.phone, c.isSpecial ? "⭐ ម៉ូយ VIP" : "", c.debt ? `ជំពាក់ $${c.debt.toLocaleString()}` : ""].filter(Boolean).join(" · "),
  })),
)

const filteredProducts = computed(() => {
  let list = products.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }
  return list
})

function getProductStock(product: Product) {
  const br = selectedBranch.value
  if (!product.stock) return { heads: 0, kg: 0 }
  const byId = product.stock[br]
  if (byId) return byId
  const branchObj = branches.value.find((b) => b.id === br)
  if (branchObj && product.stock[branchObj.name]) return product.stock[branchObj.name]
  return { heads: 0, kg: 0 }
}

// ── Smart Pricing per Client & Branch ──
function getEffectivePrice(productId: string, productName: string): { price: number; isMemorized: boolean } {
  const client = selectedClient.value
  const branchId = selectedBranch.value
  const branchObj = branches.value.find((b) => b.id === branchId)
  const branchName = branchObj?.name || branchId

  // 1. Check client's memorized custom price
  if (client?.customPrices) {
    const branchKey = `${branchId}_${productId}`
    const branchNameKey = `${branchName}_${productName}`
    if (client.customPrices[branchKey]) {
      return { price: Number(client.customPrices[branchKey]), isMemorized: true }
    }
    if (client.customPrices[branchNameKey]) {
      return { price: Number(client.customPrices[branchNameKey]), isMemorized: true }
    }
    if (client.customPrices[productId]) {
      return { price: Number(client.customPrices[productId]), isMemorized: true }
    }
    if (client.customPrices[productName]) {
      return { price: Number(client.customPrices[productName]), isMemorized: true }
    }
  }

  // 2. Check Price Matrix
  const pm = priceMatrix.value.find((x: any) => {
    const prodId = x.product?.id || x.productId || (typeof x.product === "string" ? x.product : "")
    const prodName = x.product?.name || (typeof x.product === "string" ? x.product : "")
    const brId = x.branch?.id || x.branchId || (typeof x.branch === "string" ? x.branch : "")
    const brName = x.branch?.name || (typeof x.branch === "string" ? x.branch : "")

    const prodMatch = prodId === productId || prodName === productName
    const branchMatch = brId === branchId || brName === branchName
    return prodMatch && branchMatch
  })

  if (pm) {
    if (useSpecialPrice.value && Number(pm.clientSpecialPrice) > 0) {
      return { price: Number(pm.clientSpecialPrice), isMemorized: false }
    }
    if (Number(pm.sellingPrice) > 0) {
      return { price: Number(pm.sellingPrice), isMemorized: false }
    }
  }

  // 3. Fallback to product default
  const prod = products.value.find((p) => p.id === productId || p.name === productName)
  return { price: Number(prod?.defaultPrice || 5), isMemorized: false }
}

// ── Add Product to Cart ──
function addToCart(product: Product) {
  const stock = getProductStock(product)
  if (stock.heads <= 0) {
    showToast(`ទំនិញ "${product.name}" អស់ពីស្តុកហើយ!`, "error")
    return
  }

  const existing = cart.value.find((i) => i.productId === product.id)
  const pricing = getEffectivePrice(product.id, product.name)

  if (existing) {
    const nextHeads = (parseInt(existing.heads) || 0) + 1
    if (nextHeads > stock.heads) {
      showToast(`ស្តុកមានត្រឹមតែ ${stock.heads} ក្បាលប៉ុណ្ណោះ!`, "warning")
      return
    }
    existing.heads = String(nextHeads)
    showToast(`បានបន្ថែម "${product.name}" (${nextHeads} ក្បាល)`, "success")
  } else {
    cart.value.push({
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      heads: "1",
      weightKg: "0",
      priceKg: pricing.price.toString(),
      isCustomPrice: pricing.isMemorized,
      memorizedPrice: pricing.isMemorized ? pricing.price : undefined,
    })
    showToast(`បានបន្ថែម "${product.name}" ចូលកន្ត្រក`, "success")
  }
}

function removeFromCart(index: number) {
  cart.value.splice(index, 1)
  if (cart.value.length === 0 && mobileCartOpen.value) {
    mobileCartOpen.value = false
  }
}

async function clearCart() {
  if (cart.value.length === 0) return
  const ok = await confirmAsk({
    title: "សម្អាតកន្ត្រកទំនិញ",
    text: "តើអ្នកពិតជាចង់សម្អាតកន្ត្រកទំនិញនៃការលក់នេះមែនទេ?",
    icon: "warning",
    confirmText: "សម្អាត",
    cancelText: "បោះបង់",
    danger: true,
  })
  if (ok) {
    cart.value = []
    mobileCartOpen.value = false
    showToast("បានសម្អាតកន្ត្រកទំនិញរួចរាល់", "info")
  }
}

function handleClientSelect(id: string, label: string) {
  selectedClientId.value = id
  selectedClientName.value = label
  const found = clients.value.find((c) => c.id === id || c.name === label)
  useSpecialPrice.value = found ? !!found.isSpecial : false

  cart.value.forEach((item) => {
    if (!item.isCustomPrice) {
      const p = getEffectivePrice(item.productId, item.productName)
      item.priceKg = p.price.toString()
      item.memorizedPrice = p.isMemorized ? p.price : undefined
    }
  })
}

watch(selectedBranch, (newBr) => {
  const branchObj = branches.value.find((b) => b.id === newBr)
  const brName = branchObj?.name || newBr

  // Check all active customer orders
  activeOrders.value.forEach((ord) => {
    if (ord.clientId) {
      const c = clients.value.find((x) => x.id === ord.clientId || x.name === ord.clientName)
      if (c) {
        const match =
          (c.branchId && (c.branchId === newBr || c.branchId === brName)) ||
          (c.branch && (c.branch === newBr || c.branch === brName))
        if (!match && (c.branchId || c.branch)) {
          ord.clientId = ""
          ord.clientName = ""
          ord.useSpecialPrice = false
        }
      }
    }
  })

  // Refresh cart pricing
  cart.value.forEach((item) => {
    if (!item.isCustomPrice) {
      const p = getEffectivePrice(item.productId, item.productName)
      item.priceKg = p.price.toString()
      item.memorizedPrice = p.isMemorized ? p.price : undefined
    }
  })
})

watch(useSpecialPrice, () => {
  cart.value.forEach((item) => {
    if (!item.isCustomPrice) {
      const p = getEffectivePrice(item.productId, item.productName)
      item.priceKg = p.price.toString()
      item.memorizedPrice = p.isMemorized ? p.price : undefined
    }
  })
})

// ── Line Item Calculation (Heads + Weight in Kg) ──
function calculateItem(item: PosItem) {
  const heads = parseFloat(item.heads) || 0
  const weightKg = parseFloat(item.weightKg) || 0
  const priceKg = parseFloat(item.priceKg) || 0
  const subtotal = weightKg * priceKg
  const avgKgPerHead = heads > 0 ? weightKg / heads : 0
  const avgPricePerHead = heads > 0 ? subtotal / heads : 0

  return {
    heads,
    weightKg,
    netKg: weightKg,
    priceKg,
    subtotal,
    avgKgPerHead,
    avgPricePerHead,
  }
}

// ── Overall Active Cart Totals ──
const cartTotals = computed(() => {
  let totalAmount = 0
  let totalHeads = 0
  let totalWeightKg = 0

  cart.value.forEach((item) => {
    const calc = calculateItem(item)
    totalAmount += calc.subtotal
    totalHeads += calc.heads
    totalWeightKg += calc.weightKg
  })

  return {
    totalAmount,
    totalHeads,
    totalWeightKg,
    itemCount: cart.value.length,
  }
})

const remainingDebt = computed(() => Math.max(0, cartTotals.value.totalAmount - (parseFloat(amountPaid.value) || 0)))
const changeAmount = computed(() => {
  const paid = parseFloat(amountPaid.value) || 0
  return payStatus.value === "paid" || paid >= cartTotals.value.totalAmount ? Math.max(0, paid - cartTotals.value.totalAmount) : 0
})

watch(
  () => [payStatus.value, cartTotals.value.totalAmount],
  ([status, total]) => {
    if (status === "paid") {
      amountPaid.value = Number(total).toFixed(2)
    } else if (status === "credit") {
      amountPaid.value = "0"
    }
  },
  { immediate: true },
)

function setQuickCash(amount: number | "exact") {
  if (amount === "exact") {
    amountPaid.value = cartTotals.value.totalAmount.toFixed(2)
  } else {
    amountPaid.value = amount.toString()
  }
}

// ── Numpad Modal Support ──
function openNumpad(itemIndex: number | null, field: string, currentVal: string, label: string) {
  numpadTargetItemIndex.value = itemIndex
  numpadTargetField.value = field
  numpadValue.value = currentVal || ""
  numpadLabel.value = label
  numpadOpen.value = true
}

function closeNumpad() {
  const v = numpadValue.value
  const idx = numpadTargetItemIndex.value
  const field = numpadTargetField.value

  if (idx !== null && cart.value[idx]) {
    const item = cart.value[idx]
    if (field === "heads") item.heads = v
    else if (field === "weightKg") item.weightKg = v
    else if (field === "priceKg") {
      item.priceKg = v
      item.isCustomPrice = true
    }
  } else if (field === "amountPaid") {
    amountPaid.value = v
  }
  numpadOpen.value = false
}

// ── Add New Client in POS ──
async function addNewClientFromPOS() {
  if (!newClientForm.name.trim() || isCreatingClient.value) return
  isCreatingClient.value = true
  try {
    const branchObj = branches.value.find((b) => b.id === selectedBranch.value)
    const created = await api.post<any>("/clients", {
      name: newClientForm.name.trim(),
      phone: newClientForm.phone.trim(),
      branchId: selectedBranch.value,
      branch: branchObj?.name || selectedBranch.value,
      isSpecial: newClientForm.isSpecial,
    })
    showAddClientModal.value = false
    newClientForm.name = ""
    newClientForm.phone = ""
    newClientForm.isSpecial = false
    clients.value = await api.get<Client[]>("/clients")
    if (created?.id || created?.name) {
      handleClientSelect(created.id || created.name, created.name || created.id)
    }
    showToast("បានបង្កើតអតិថិជនថ្មីជោគជ័យ", "success")
  } catch (err: any) {
    alertError("បរាជ័យ", err?.data?.message || "មិនអាចបន្ថែមអតិថិជនបានទេ")
  } finally {
    isCreatingClient.value = false
  }
}

// ── Checkout & Submit Sale ──
async function submitSale() {
  if (cart.value.length === 0 || isSaving.value) return
  isSaving.value = true
  try {
    const itemsPayload = cart.value.map((item) => {
      const calc = calculateItem(item)
      return {
        product: item.productId,
        productName: item.productName,
        unit: "head" as const,
        qty: calc.heads,
        price: calc.priceKg,
        total: calc.subtotal,
        heads: calc.heads,
        kg: calc.weightKg,
      }
    })

    const payload = {
      date: new Date().toISOString().slice(0, 10),
      client: selectedClientName.value || "អតិថិជនទូទៅ",
      clientId: selectedClientId.value || undefined,
      branch: selectedBranch.value,
      branchId: selectedBranch.value,
      total: cartTotals.value.totalAmount,
      status: payStatus.value,
      paid: parseFloat(amountPaid.value) || 0,
      method: payMethod.value,
      staff: user.value?.name || user.value?.username || (role.value === "admin" ? "Admin" : "Sale Staff"),
      items: itemsPayload,
    }

    const res = await api.post<any>("/sales", payload)

    lastCompletedSale.value = {
      invoiceNo: res.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
      date: payload.date,
      time: new Date().toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit" }),
      client: selectedClientName.value || "អតិថិជនទូទៅ",
      clientPhone: selectedClient.value?.phone || "",
      branch: branches.value.find((b) => b.id === selectedBranch.value)?.name || selectedBranch.value,
      staff: payload.staff,
      items: cart.value.map((i) => ({ ...i, ...calculateItem(i) })),
      totalAmount: cartTotals.value.totalAmount,
      totalHeads: cartTotals.value.totalHeads,
      totalWeightKg: cartTotals.value.totalWeightKg,
      paid: parseFloat(amountPaid.value) || 0,
      remaining: remainingDebt.value,
      change: changeAmount.value,
      payStatus: payStatus.value,
      payMethod: payMethod.value,
      note: note.value,
      completedOrderId: activeOrderId.value,
    }

    const [p, c] = await Promise.all([
      api.get<Product[]>("/products").catch(() => []),
      api.get<Client[]>("/clients").catch(() => []),
    ])
    if (p.length) products.value = p
    if (c.length) clients.value = c

    mobileCartOpen.value = false
    showReceipt.value = true
    showToast("ការលក់ត្រូវបានរក្សាទុកជោគជ័យ", "success")
  } catch (err: any) {
    alertError("បរាជ័យ", err?.data?.message || "មិនអាចរក្សាទុកការលក់បានទេ")
  } finally {
    isSaving.value = false
  }
}

function startNewSale() {
  const completedId = lastCompletedSale.value?.completedOrderId
  if (completedId) {
    const idx = activeOrders.value.findIndex((o) => o.id === completedId)
    if (idx !== -1) {
      activeOrders.value.splice(idx, 1)
    }
  }

  // If there are other open/held customer orders, switch to the first one, else create a fresh order
  if (activeOrders.value.length === 0) {
    const fresh = createEmptyOrder()
    activeOrders.value.push(fresh)
    activeOrderId.value = fresh.id
  } else {
    activeOrderId.value = activeOrders.value[0].id
  }

  showReceipt.value = false
  lastCompletedSale.value = null
  mobileCartOpen.value = false
}

function printReceipt() {
  window.print()
}
</script>

<template>
  <!-- ── LIGHT MODE PROFESSIONAL MULTI-CUSTOMER POS ROOT ── -->
  <div class="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col font-sans -m-4 md:-m-6 lg:-m-8">
    <!-- ── TOP POS HEADER BAR (Clean White / Classic Light) ── -->
    <header class="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      <div class="flex items-center gap-2.5">
        <button
          @click="router.push('/dashboard')"
          class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
          title="ត្រឡប់ទៅផ្ទាំងដើម"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span class="hidden sm:inline">ផ្ទាំងដើម</span>
        </button>

        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-[#0f2a4a] flex items-center justify-center text-white font-black text-xs shadow-xs">
            POS
          </div>
          <div>
            <h1 class="text-sm md:text-base font-bold text-slate-900 flex items-center gap-1.5 leading-none">
              <span>ប្រព័ន្ធលក់</span>
              <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> Multi-Customer
              </span>
            </h1>
          </div>
        </div>
      </div>

      <!-- Center: Branch & Staff -->
      <div class="flex items-center gap-2 sm:gap-3">
        <div v-if="role === 'admin'" class="flex items-center">
          <select
            v-model="selectedBranch"
            class="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer transition-colors focus:border-[#00b4c8]"
          >
            <option v-for="b in branches" :key="b.id" :value="b.id">
              🏬 {{ b.name }}
            </option>
          </select>
        </div>
        <div v-else class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
          <span>🏬</span>
          <span>{{ branches.find(b => b.id === selectedBranch)?.name || selectedBranch }}</span>
        </div>

        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{{ user?.name || user?.username || 'Staff' }}</span>
        </div>
      </div>

      <!-- Top Right Actions -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Hold Order Shortcut Button -->
        <button
          @click="holdCurrentOrder"
          :disabled="cart.length === 0"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          title="ផ្អាកការលក់នេះ ហើយបម្រើអតិថិជនបន្ទាប់"
        >
          <span>⏸️</span>
          <span class="hidden md:inline">ផ្អាកទុក (Hold)</span>
        </button>

        <button
          @click="clearCart"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors text-xs font-bold flex items-center gap-1.5"
          title="សម្អាតកន្ត្រក"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span class="hidden md:inline">សម្អាត</span>
        </button>

        <button
          @click="router.push('/sales')"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-xs font-bold flex items-center gap-1.5"
          title="ប្រវត្តិលក់"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span class="hidden md:inline">ប្រវត្តិ</span>
        </button>
      </div>
    </header>

    <!-- ── MULTI-CUSTOMER ORDER TABS BAR (Switch between walk-in customers instantly) ── -->
    <div class="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-2xs">
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <div
          v-for="(ord, idx) in activeOrders"
          :key="ord.id"
          @click="switchOrder(ord.id)"
          class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 select-none border"
          :class="ord.id === activeOrderId
            ? 'bg-[#0f2a4a] text-white border-[#0f2a4a] shadow-xs'
            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
        >
          <div class="flex items-center gap-1.5">
            <span>👤</span>
            <span class="truncate max-w-[120px]">
              {{ ord.clientName || `អតិថិជន #${ord.orderNumber}` }}
            </span>
          </div>

          <!-- Item count badge in this order -->
          <span
            v-if="ord.cart.length > 0"
            class="px-1.5 py-0.2 rounded-full text-[10px] font-black"
            :class="ord.id === activeOrderId ? 'bg-cyan-400 text-slate-950' : 'bg-slate-200 text-slate-800'"
          >
            {{ ord.cart.length }}
          </span>

          <!-- Close order tab -->
          <span
            v-if="activeOrders.length > 1"
            @click.stop="removeOrder(ord.id)"
            class="hover:text-rose-400 p-0.5 rounded transition-colors text-xs font-normal opacity-70 hover:opacity-100"
            title="បិទការលក់នេះ"
          >
            ✕
          </span>
        </div>

        <!-- Add Next Customer Order Button -->
        <button
          type="button"
          @click="addNewCustomerOrder"
          class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          title="បន្ថែមអតិថិជនបន្ទាប់ (New Customer Tab)"
        >
          <span class="text-sm font-black">+</span>
          <span>អតិថិជនថ្មី</span>
        </button>
      </div>

      <!-- Quick Total Count of active customers -->
      <div class="hidden sm:flex items-center text-[11px] font-bold text-slate-500 shrink-0">
        កំពុងបម្រើ៖ <strong class="text-slate-800 ml-1">{{ activeOrders.length }} នាក់</strong>
      </div>
    </div>

    <!-- ── POS VIEWPORT: 2-COLUMN ON DESKTOP, MOBILE FRIENDLY CATALOG ON MOBILE ── -->
    <main class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden pb-20 lg:pb-0">
      <!-- ── LEFT COLUMN: PRODUCT CATALOG & QUICK SEARCH (Cols 7 on Desktop) ── -->
      <section class="lg:col-span-7 xl:col-span-7 flex flex-col bg-slate-50/60 overflow-y-auto p-3.5 sm:p-4 lg:p-5 border-r border-slate-200">
        <!-- Client Selector on Mobile / Top of Catalog -->
        <div class="mb-3.5 bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs lg:hidden space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700">
              👤 អតិថិជន ({{ currentOrder.clientName || 'អតិថិជន #' + currentOrder.orderNumber }})
            </span>
            <button
              type="button"
              @click="showAddClientModal = true"
              class="text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 font-bold px-2.5 py-1 rounded-xl"
            >
              + បន្ថែមម៉ូយ
            </button>
          </div>
          <SearchDropdown
            :options="clientOptions"
            :value="selectedClientId"
            placeholder="ស្វែងរក ឬជ្រើសរើសម៉ូយ..."
            label=""
            @change="handleClientSelect"
          />
          <div v-if="selectedClient?.debt" class="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
            <span class="text-rose-700 font-medium">ជំពាក់ប្រាក់ចាស់</span>
            <span class="font-bold text-rose-600">${{ selectedClient.debt.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="relative mb-3.5">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ស្វែងរកផលិតផល... (Search Products)"
            class="w-full bg-white border border-slate-200 focus:border-[#00b4c8] rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all shadow-xs"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <!-- Products Grid (Touch Friendly Cards) -->
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 flex-1 content-start">
          <div
            v-for="p in filteredProducts"
            :key="p.id"
            @click="getProductStock(p).heads > 0 ? addToCart(p) : null"
            class="group border rounded-2xl p-3.5 transition-all duration-150 transform select-none relative overflow-hidden flex flex-col justify-between"
            :class="getProductStock(p).heads > 0
              ? 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-[#00b4c8] cursor-pointer active:scale-98 shadow-xs hover:shadow-md'
              : 'bg-slate-100/90 border-slate-200 opacity-60 cursor-not-allowed'"
          >
            <!-- Out of Stock Badge -->
            <div
              v-if="getProductStock(p).heads <= 0"
              class="absolute top-2 right-2 px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg shadow-2xs flex items-center gap-1 z-10"
            >
              <span>🚫</span>
              <span>អស់ពីស្តុក</span>
            </div>

            <!-- Badge if in current cart -->
            <div
              v-else-if="cart.some(i => i.productId === p.id)"
              class="absolute top-2 right-2 px-2 py-0.5 bg-[#0f2a4a] text-white font-bold text-[10px] rounded-lg shadow-xs flex items-center gap-1 z-10"
            >
              <span>✓</span>
              <span>{{ cart.find(i => i.productId === p.id)?.heads }} ក្បាល</span>
            </div>

            <div>
              <!-- Avatar & Name -->
              <div class="flex items-center gap-2.5 mb-2">
                <div class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                  🐔
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-bold text-slate-900 truncate">
                    {{ p.name }}
                  </h3>
                  <span
                    v-if="getEffectivePrice(p.id, p.name).isMemorized"
                    class="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200"
                  >
                    ⭐ តម្លៃម៉ូយ
                  </span>
                </div>
              </div>

              <!-- Stock Information -->
              <div class="space-y-0.5 my-1 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500 text-[11px]">ស្តុក:</span>
                  <span
                    class="font-bold text-[11px]"
                    :class="getProductStock(p).heads > 150 ? 'text-emerald-700' : getProductStock(p).heads > 0 ? 'text-amber-700' : 'text-rose-600 font-black'"
                  >
                    {{ getProductStock(p).heads.toLocaleString() }} ក្បាល ({{ getProductStock(p).kg.toFixed(0) }}kg)
                  </span>
                </div>
              </div>
            </div>

            <!-- Price & Tap Add -->
            <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-sm font-black text-[#0f2a4a]">
                  ${{ getEffectivePrice(p.id, p.name).price.toFixed(2) }}
                </span>
                <span class="text-[10px] text-slate-500 font-medium">/kg</span>
              </div>
              <span
                v-if="getProductStock(p).heads > 0"
                class="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-[#00b4c8] group-hover:text-white text-slate-700 flex items-center justify-center font-bold text-base transition-colors"
              >
                +
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px]"
              >
                អស់ស្តុក
              </span>
            </div>
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="text-center py-12 text-slate-400">
          <div class="text-3xl mb-1">🔍</div>
          <p class="text-xs font-bold">រកមិនឃើញផលិតផល "{{ searchQuery }}" ទេ</p>
        </div>
      </section>

      <!-- ── RIGHT COLUMN: CART REGISTER & CHECKOUT (Desktop View) ── -->
      <section class="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-white flex-col h-full overflow-hidden border-l border-slate-200">
        <!-- Client Selector Card in Register -->
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>👤</span> អតិថិជន ({{ currentOrder.clientName || 'អតិថិជន #' + currentOrder.orderNumber }})
            </span>
            <button
              type="button"
              @click="showAddClientModal = true"
              class="text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 font-bold px-2.5 py-1 rounded-xl transition-colors"
            >
              + បន្ថែមម៉ូយថ្មី
            </button>
          </div>

          <SearchDropdown
            :options="clientOptions"
            :value="selectedClientId"
            placeholder="ស្វែងរក ឬជ្រើសរើសម៉ូយ..."
            label=""
            @change="handleClientSelect"
          />

          <!-- Client details & VIP price toggle -->
          <div v-if="selectedClient" class="grid grid-cols-2 gap-2 pt-1">
            <div v-if="selectedClient.debt > 0" class="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
              <span class="text-rose-700 font-medium">ជំពាក់ចាស់</span>
              <span class="font-bold text-rose-600">${{ selectedClient.debt.toLocaleString() }}</span>
            </div>

            <div
              @click="useSpecialPrice = !useSpecialPrice"
              class="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs cursor-pointer select-none"
            >
              <div>
                <div class="font-bold text-purple-900 text-[11px]">តម្លៃពិសេស (ម៉ូយ)</div>
                <div class="text-[10px] text-purple-600">{{ useSpecialPrice ? "កំពុងបើក" : "បិទ" }}</div>
              </div>
              <div
                class="w-8 h-4.5 rounded-full transition-colors relative p-0.5 flex items-center"
                :class="useSpecialPrice ? 'bg-purple-600' : 'bg-slate-300'"
              >
                <div
                  class="w-3.5 h-3.5 rounded-full bg-white transition-transform transform shadow"
                  :class="useSpecialPrice ? 'translate-x-3.5' : 'translate-x-0'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Line Items (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
            <span>ទំនិញក្នុងកន្ត្រក ({{ cart.length }} មុខ)</span>
            <span v-if="cart.length > 0" class="text-emerald-600">សរុប: ${{ cartTotals.totalAmount.toFixed(2) }}</span>
          </div>

          <!-- Empty Cart State -->
          <div v-if="cart.length === 0" class="text-center py-12 text-slate-400 space-y-1.5">
            <div class="text-3xl">🛒</div>
            <div class="font-bold text-slate-700 text-xs">កន្ត្រកទំនិញទទេ</div>
            <p class="text-[11px] text-slate-400 max-w-[200px] mx-auto">
              សូមចុចលើផលិតផលនៅខាងឆ្វេង ដើម្បីបន្ថែមចូលក្នុងការលក់នេះ
            </p>
          </div>

          <!-- Line Items List -->
          <div
            v-for="(item, idx) in cart"
            :key="item.id"
            class="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 relative shadow-2xs"
          >
            <!-- Line Item Top -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-md bg-[#0f2a4a] text-white flex items-center justify-center text-[10px] font-bold">
                  {{ idx + 1 }}
                </span>
                <span class="text-sm font-bold text-slate-900">{{ item.productName }}</span>
                <span
                  v-if="item.isCustomPrice"
                  class="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded border border-amber-200"
                >
                  ⭐ តម្លៃម៉ូយ
                </span>
              </div>
              <button
                type="button"
                @click="removeFromCart(idx)"
                class="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                title="លុប"
              >
                ✕
              </button>
            </div>

            <!-- 3 Clean Input Columns: Heads, Weight (Kg), Price/Kg ($) -->
            <div class="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">ចំនួនក្បាល</label>
                <input
                  v-model="item.heads"
                  type="number"
                  placeholder="0"
                  class="w-full bg-white border border-slate-300 focus:border-[#00b4c8] rounded-xl px-2.5 py-2 text-center font-bold text-slate-900 text-sm outline-none"
                  @click="openNumpad(idx, 'heads', item.heads, 'ចំនួនក្បាល')"
                />
              </div>

              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">ទម្ងន់គីឡូ (Kg)</label>
                <input
                  v-model="item.weightKg"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  class="w-full bg-white border border-slate-300 focus:border-[#00b4c8] rounded-xl px-2.5 py-2 text-center font-bold text-slate-900 text-sm outline-none"
                  @click="openNumpad(idx, 'weightKg', item.weightKg, 'ទម្ងន់គីឡូ (Kg)')"
                />
              </div>

              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">តម្លៃ/Kg ($)</label>
                <input
                  v-model="item.priceKg"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full bg-white border border-slate-300 focus:border-[#00b4c8] rounded-xl px-2.5 py-2 text-center font-black text-cyan-800 text-sm outline-none"
                  @click="openNumpad(idx, 'priceKg', item.priceKg, 'តម្លៃ/Kg')"
                />
              </div>
            </div>

            <!-- Calculation Output Row -->
            <div class="bg-white rounded-xl px-3 py-2 border border-slate-200/80 flex items-center justify-between text-xs">
              <div class="text-slate-600 text-[11px] space-x-1.5">
                <span>មធ្យម: <strong class="text-slate-800">{{ calculateItem(item).avgKgPerHead.toFixed(2) }} kg/ក្បាល</strong></span>
                <span>(${{ calculateItem(item).avgPricePerHead.toFixed(2) }}/ក្បាល)</span>
              </div>
              <div class="text-right">
                <span class="text-slate-500 text-[10px] mr-1">សរុប:</span>
                <span class="text-sm font-black text-emerald-600">${{ calculateItem(item).subtotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary & Payment Footer (Desktop) -->
        <div class="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
          <!-- Totals Grid -->
          <div class="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
            <div>
              <div class="text-[10px] text-slate-500">ទំនិញសរុប</div>
              <div class="font-bold text-slate-800">{{ cartTotals.itemCount }} មុខ</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500">ក្បាលសរុប</div>
              <div class="font-bold text-slate-800">{{ cartTotals.totalHeads }} ក្បាល</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500">ទម្ងន់សរុប</div>
              <div class="font-bold text-slate-800">{{ cartTotals.totalWeightKg.toFixed(2) }} kg</div>
            </div>
          </div>

          <!-- Total Amount Row -->
          <div class="flex items-baseline justify-between px-1">
            <span class="text-xs font-bold text-slate-600">តម្លៃសរុប (Grand Total):</span>
            <span class="text-2xl font-black text-emerald-600">${{ cartTotals.totalAmount.toFixed(2) }}</span>
          </div>

          <!-- Payment Status & Method -->
          <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <div class="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                @click="payStatus = 'paid'"
                class="py-1 rounded-lg transition-all text-center text-[11px]"
                :class="payStatus === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              >
                បង់ពេញ
              </button>
              <button
                type="button"
                @click="payStatus = 'partial'"
                class="py-1 rounded-lg transition-all text-center text-[11px]"
                :class="payStatus === 'partial' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              >
                បង់ខ្លះ
              </button>
              <button
                type="button"
                @click="payStatus = 'credit'"
                class="py-1 rounded-lg transition-all text-center text-[11px]"
                :class="payStatus === 'credit' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              >
                ជំពាក់
              </button>
            </div>

            <div class="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                @click="payMethod = 'cash'"
                class="py-1 rounded-lg transition-all text-center text-[11px]"
                :class="payMethod === 'cash' ? 'bg-[#0f2a4a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              >
                💵 សាច់ប្រាក់
              </button>
              <button
                type="button"
                @click="payMethod = 'bank'"
                class="py-1 rounded-lg transition-all text-center text-[11px]"
                :class="payMethod === 'bank' ? 'bg-[#0f2a4a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              >
                🏦 KHQR
              </button>
            </div>
          </div>

          <!-- Quick Cash Amount Shortcuts -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-bold no-scrollbar">
            <button
              type="button"
              @click="setQuickCash('exact')"
              class="px-2.5 py-1 bg-white hover:bg-slate-100 rounded-lg text-emerald-700 shrink-0 border border-slate-200 text-xs"
            >
              ស្មើថ្លៃ
            </button>
            <button
              v-for="amt in [10, 20, 50, 100, 200, 500]"
              :key="amt"
              type="button"
              @click="setQuickCash(amt)"
              class="px-2.5 py-1 bg-white hover:bg-slate-100 rounded-lg text-slate-700 shrink-0 border border-slate-200 text-xs"
            >
              +${{ amt }}
            </button>
          </div>

          <!-- Amount Paid & Change / Debt -->
          <div class="grid grid-cols-2 gap-2 items-center">
            <div>
              <label class="block text-[10px] text-slate-500 font-semibold mb-1">ប្រាក់ទទួល ($):</label>
              <input
                v-model="amountPaid"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="w-full bg-white border border-slate-300 focus:border-[#00b4c8] rounded-xl px-3 py-2 text-base font-black text-slate-900 outline-none"
                @click="openNumpad(null, 'amountPaid', amountPaid, 'ប្រាក់ទទួល')"
              />
            </div>

            <div class="h-full flex flex-col justify-end">
              <div v-if="payStatus !== 'paid' && remainingDebt > 0" class="bg-rose-50 border border-rose-200 rounded-xl p-2 text-right">
                <div class="text-[10px] text-rose-700 font-medium">ប្រាក់ជំពាក់</div>
                <div class="text-sm font-black text-rose-600">${{ remainingDebt.toFixed(2) }}</div>
              </div>
              <div v-else class="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-right">
                <div class="text-[10px] text-emerald-700 font-medium">ប្រាក់អាប់</div>
                <div class="text-sm font-black text-emerald-600">${{ changeAmount.toFixed(2) }}</div>
              </div>
            </div>
          </div>

          <!-- Checkout Button (Desktop) -->
          <button
            type="button"
            @click="submitSale"
            :disabled="cart.length === 0 || isSaving"
            class="w-full py-3 rounded-2xl bg-[#00b4c8] hover:bg-[#009fb0] text-white font-bold text-base shadow-sm transition-all transform active:scale-99 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isSaving" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span v-else>⚡ បញ្ជាក់ការលក់ (${{ cartTotals.totalAmount.toFixed(2) }})</span>
          </button>
        </div>
      </section>
    </main>

    <!-- ── STICKY BOTTOM BAR FOR MOBILE SCREEN (Best Mobile UX) ── -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3">
      <div @click="mobileCartOpen = true" class="cursor-pointer">
        <div class="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
          <span>🛒 {{ currentOrder.clientName || `អតិថិជន #${currentOrder.orderNumber}` }}:</span>
          <strong class="text-slate-800">{{ cart.length }} មុខ ({{ cartTotals.totalHeads }} ក្បាល)</strong>
        </div>
        <div class="text-lg font-black text-emerald-600">
          ${{ cartTotals.totalAmount.toFixed(2) }}
        </div>
      </div>

      <button
        type="button"
        @click="mobileCartOpen = true"
        :disabled="cart.length === 0"
        class="px-5 py-3 rounded-2xl bg-[#00b4c8] text-white font-bold text-sm shadow-sm transition-all active:scale-98 disabled:opacity-40 flex items-center gap-2"
      >
        <span>ពិនិត្យ & គិតលុយ</span>
        <span class="w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-black">
          {{ cart.length }}
        </span>
      </button>
    </div>

    <!-- ── MOBILE CART & CHECKOUT SLIDE-UP DRAWER ── -->
    <Teleport to="body">
      <div v-if="mobileCartOpen" class="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
          <!-- Drawer Header with Order Switcher on Mobile -->
          <div class="px-4 py-3 border-b border-slate-200 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-slate-900 text-sm">
                  🛒 {{ currentOrder.clientName || `អតិថិជន #${currentOrder.orderNumber}` }} ({{ cart.length }} មុខ)
                </h3>
                <span class="text-xs font-black text-emerald-600">${{ cartTotals.totalAmount.toFixed(2) }}</span>
              </div>
              <button @click="mobileCartOpen = false" class="p-1 text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <!-- Mobile Active Orders Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                v-for="ord in activeOrders"
                :key="ord.id"
                @click="switchOrder(ord.id)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 border"
                :class="ord.id === activeOrderId ? 'bg-[#0f2a4a] text-white border-[#0f2a4a]' : 'bg-slate-100 text-slate-700 border-slate-200'"
              >
                {{ ord.clientName || `អតិថិជន #${ord.orderNumber}` }} ({{ ord.cart.length }})
              </button>
              <button
                @click="addNewCustomerOrder"
                class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold shrink-0"
              >
                + ថែមអតិថិជន
              </button>
            </div>
          </div>

          <!-- Drawer Items Scrollable -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3 max-h-[42vh]">
            <div
              v-for="(item, idx) in cart"
              :key="item.id"
              class="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 relative"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-sm text-slate-900">{{ item.productName }}</span>
                <button @click="removeFromCart(idx)" class="text-slate-400 hover:text-rose-600 text-xs">✕ លុប</button>
              </div>

              <!-- 3 Clean Input Columns on Mobile -->
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label class="block text-[10px] text-slate-500 mb-1">ចំនួនក្បាល</label>
                  <input
                    v-model="item.heads"
                    type="number"
                    placeholder="0"
                    class="w-full bg-white border border-slate-300 rounded-lg p-2 text-center font-bold text-sm"
                    @click="openNumpad(idx, 'heads', item.heads, 'ចំនួនក្បាល')"
                  />
                </div>
                <div>
                  <label class="block text-[10px] text-slate-500 mb-1">ទម្ងន់ (Kg)</label>
                  <input
                    v-model="item.weightKg"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    class="w-full bg-white border border-slate-300 rounded-lg p-2 text-center font-bold text-sm"
                    @click="openNumpad(idx, 'weightKg', item.weightKg, 'ទម្ងន់គីឡូ (Kg)')"
                  />
                </div>
                <div>
                  <label class="block text-[10px] text-slate-500 mb-1">$/Kg</label>
                  <input
                    v-model="item.priceKg"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full bg-white border border-slate-300 rounded-lg p-2 text-center font-bold text-sm text-cyan-800"
                    @click="openNumpad(idx, 'priceKg', item.priceKg, 'តម្លៃ/Kg')"
                  />
                </div>
              </div>

              <div class="bg-white rounded-lg p-2 flex items-center justify-between text-xs border border-slate-200">
                <span class="text-slate-500 text-[11px]">មធ្យម: {{ calculateItem(item).avgKgPerHead.toFixed(2) }}kg/ក្បាល</span>
                <span class="font-black text-emerald-600">${{ calculateItem(item).subtotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Drawer Payment Bottom -->
          <div class="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div class="grid grid-cols-2 gap-2 text-xs font-bold">
              <!-- Payment Status -->
              <div class="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  @click="payStatus = 'paid'"
                  class="py-1 rounded-lg text-[10px]"
                  :class="payStatus === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-600'"
                >
                  បង់ពេញ
                </button>
                <button
                  type="button"
                  @click="payStatus = 'partial'"
                  class="py-1 rounded-lg text-[10px]"
                  :class="payStatus === 'partial' ? 'bg-amber-500 text-white' : 'text-slate-600'"
                >
                  បង់ខ្លះ
                </button>
                <button
                  type="button"
                  @click="payStatus = 'credit'"
                  class="py-1 rounded-lg text-[10px]"
                  :class="payStatus === 'credit' ? 'bg-rose-600 text-white' : 'text-slate-600'"
                >
                  ជំពាក់
                </button>
              </div>

              <!-- Payment Method -->
              <div class="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  @click="payMethod = 'cash'"
                  class="py-1 rounded-lg text-[10px]"
                  :class="payMethod === 'cash' ? 'bg-[#0f2a4a] text-white' : 'text-slate-600'"
                >
                  សាច់ប្រាក់
                </button>
                <button
                  type="button"
                  @click="payMethod = 'bank'"
                  class="py-1 rounded-lg text-[10px]"
                  :class="payMethod === 'bank' ? 'bg-[#0f2a4a] text-white' : 'text-slate-600'"
                >
                  KHQR
                </button>
              </div>
            </div>

            <!-- Amount paid & total -->
            <div class="grid grid-cols-2 gap-2 items-center">
              <div>
                <label class="block text-[10px] text-slate-500 font-semibold mb-1">ប្រាក់ទទួល ($):</label>
                <input
                  v-model="amountPaid"
                  type="number"
                  step="0.01"
                  class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-black text-slate-900"
                  @click="openNumpad(null, 'amountPaid', amountPaid, 'ប្រាក់ទទួល')"
                />
              </div>
              <div class="text-right">
                <div class="text-[10px] text-slate-500">សរុបទាំងអស់:</div>
                <div class="text-xl font-black text-emerald-600">${{ cartTotals.totalAmount.toFixed(2) }}</div>
              </div>
            </div>

            <!-- Submit -->
            <button
              type="button"
              @click="submitSale"
              :disabled="cart.length === 0 || isSaving"
              class="w-full py-3.5 rounded-2xl bg-[#00b4c8] text-white font-bold text-base shadow-sm active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span v-if="isSaving" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span v-else>⚡ បញ្ជាក់ការលក់ (${{ cartTotals.totalAmount.toFixed(2) }})</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── MODAL 1: ADD CLIENT MODAL ── -->
    <Teleport to="body">
      <div v-if="showAddClientModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl text-slate-900 animate-in fade-in zoom-in duration-150 border border-slate-200">
          <h3 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>👤</span> បន្ថែមអតិថិជន (ម៉ូយ) ថ្មី
          </h3>
          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">ឈ្មោះអតិថិជន *</label>
              <input
                v-model="newClientForm.name"
                placeholder="ឧ. ម៉ូយ សុខា..."
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-[#00b4c8]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">លេខទូរស័ព្ទ</label>
              <input
                v-model="newClientForm.phone"
                placeholder="012 345 678..."
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-[#00b4c8]"
              />
            </div>
            <div
              @click="newClientForm.isSpecial = !newClientForm.isSpecial"
              class="flex items-center justify-between p-3.5 bg-purple-50 rounded-xl border border-purple-200 cursor-pointer select-none"
            >
              <div>
                <div class="text-xs font-bold text-purple-900">អតិថិជនពិសេស (ម៉ូយ VIP)</div>
                <div class="text-[11px] text-purple-600 mt-0.5">ទទួលបានតម្លៃពិសេសដោយស្វ័យប្រវត្តិ</div>
              </div>
              <div
                class="w-9 h-5 rounded-full transition-colors relative p-0.5 flex items-center"
                :class="newClientForm.isSpecial ? 'bg-purple-600' : 'bg-slate-300'"
              >
                <div
                  class="w-4 h-4 rounded-full bg-white transition-transform transform shadow"
                  :class="newClientForm.isSpecial ? 'translate-x-4' : 'translate-x-0'"
                />
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="showAddClientModal = false"
              class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              បោះបង់
            </button>
            <button
              @click="addNewClientFromPOS"
              :disabled="isCreatingClient"
              class="px-5 py-2 rounded-xl bg-[#00b4c8] text-white text-xs font-bold hover:bg-[#009fb0] transition-colors disabled:opacity-50"
            >
              {{ isCreatingClient ? "កំពុងរក្សាទុក..." : "រក្សាទុក & ជ្រើសរើស" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── MODAL 2: THERMAL POS RECEIPT MODAL ── -->
    <Teleport to="body">
      <div v-if="showReceipt && lastCompletedSale" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
        <div class="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-150 print:shadow-none print:w-full print:max-w-none print:rounded-none">
          <!-- Receipt Header -->
          <div class="text-center border-b-2 border-dashed border-slate-300 pb-4 mb-4">
            <div class="text-xl font-black text-slate-900">សុក សំណាង ស្តុក</div>
            <div class="text-xs text-slate-600 font-semibold mt-0.5">វិក្កយបត្រលក់ទំនិញ / POS RECEIPT</div>
            <div class="text-xs text-slate-500 font-mono mt-1">
              លេខ: <strong>{{ lastCompletedSale.invoiceNo }}</strong> · {{ lastCompletedSale.date }} {{ lastCompletedSale.time }}
            </div>
          </div>

          <!-- Customer & Branch -->
          <div class="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-3 mb-3">
            <div>
              <span class="text-slate-500">អតិថិជន:</span>
              <strong class="text-slate-900 block">{{ lastCompletedSale.client }}</strong>
              <span v-if="lastCompletedSale.clientPhone" class="text-slate-500 text-[10px] block">{{ lastCompletedSale.clientPhone }}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-500">សាខា:</span>
              <strong class="text-slate-900 block">{{ lastCompletedSale.branch }}</strong>
              <span class="text-slate-500 text-[10px] block">អ្នកលក់: {{ lastCompletedSale.staff }}</span>
            </div>
          </div>

          <!-- Itemized Table -->
          <div class="border-b-2 border-dashed border-slate-300 pb-3 mb-3">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200">
                  <th class="text-left py-1 font-semibold">ទំនិញ</th>
                  <th class="text-center py-1 font-semibold">ក្បាល/គីឡូ</th>
                  <th class="text-right py-1 font-semibold">តម្លៃ/kg</th>
                  <th class="text-right py-1 font-semibold">សរុប</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(it, i) in lastCompletedSale.items" :key="i" class="py-1.5">
                  <td class="py-1.5 font-bold text-slate-800">
                    {{ it.productName }}
                  </td>
                  <td class="py-1.5 text-center text-slate-600">
                    {{ it.heads }} ក្បាល ({{ it.weightKg?.toFixed(1) }}kg)
                  </td>
                  <td class="py-1.5 text-right font-mono text-slate-700">${{ it.priceKg }}</td>
                  <td class="py-1.5 text-right font-mono font-black text-slate-900">${{ it.subtotal?.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="space-y-1 text-xs border-b-2 border-dashed border-slate-300 pb-3 mb-3 font-semibold">
            <div class="flex justify-between text-slate-600">
              <span>ចំនួនក្បាលសរុប:</span>
              <span>{{ lastCompletedSale.totalHeads }} ក្បាល</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>ទម្ងន់សរុប:</span>
              <span>{{ lastCompletedSale.totalWeightKg?.toFixed(2) }} គីឡូ</span>
            </div>
            <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>តម្លៃសរុប (Grand Total):</span>
              <span class="text-base">${{ lastCompletedSale.totalAmount.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-slate-700">
              <span>ប្រាក់បានបង់ ({{ lastCompletedSale.payMethod === 'bank' ? 'KHQR' : 'សាច់ប្រាក់' }}):</span>
              <span class="font-bold">${{ lastCompletedSale.paid.toFixed(2) }}</span>
            </div>
            <div v-if="lastCompletedSale.change > 0" class="flex justify-between text-emerald-700 font-bold">
              <span>ប្រាក់អាប់:</span>
              <span>${{ lastCompletedSale.change.toFixed(2) }}</span>
            </div>
            <div v-if="lastCompletedSale.remaining > 0" class="flex justify-between text-rose-600 font-black">
              <span>ប្រាក់ជំពាក់:</span>
              <span>${{ lastCompletedSale.remaining.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-[11px] text-slate-500">
            <p class="font-bold">សូមអរគុណចំពោះការជាវផលិតផលរបស់យើងខ្ញុំ!</p>
          </div>

          <!-- Actions -->
          <div class="mt-5 flex items-center justify-between gap-2 print:hidden">
            <button
              @click="printReceipt"
              class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span>បោះពុម្ព</span>
            </button>
            <button
              @click="startNewSale"
              class="flex-1 py-2.5 bg-[#00b4c8] text-white rounded-xl font-bold text-xs shadow-sm"
            >
              {{ activeOrders.length > 1 ? '➡️ ទៅការលក់បន្ទាប់' : '➕ លក់ថ្មី' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── NUMPAD MODAL ── -->
    <NumpadModal
      :isOpen="numpadOpen"
      :value="numpadValue"
      :label="numpadLabel"
      @update:value="numpadValue = $event"
      @close="closeNumpad"
    />
  </div>
</template>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }
  .print\:p-0,
  .print\:p-0 * {
    visibility: visible;
  }
  .print\:p-0 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
