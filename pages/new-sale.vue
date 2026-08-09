<script setup lang="ts">
import type { Unit, PayStatus, Branch, Product, Client } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const { role, user } = useAuth()
const router = useRouter()
const api = useApi()
const { kgPerTaka, load: loadSettings } = useSettings()

const step = ref(1)
const saved = ref(false)
const saving = ref(false)

const clients = ref<Client[]>([])
const products = ref<Product[]>([])
const branches = ref<Branch[]>([])
const invoiceNo = ref("")

const clientId = ref("")
const clientName = ref("")
const productId = ref("")
const productName = ref("")
const unit = ref<Unit>("taka")
const branch = ref("")

const qtyTaka = ref("1")
const totalHeads = ref("")

const qtyHead = ref("")
const priceHead = ref("")

const grossKg = ref("")
const tareKg = ref("")
const priceKg = ref("")

const payStatus = ref<PayStatus>("paid")
const payMethod = ref<"cash" | "bank">("cash")
const amountPaid = ref("")
const note = ref("")

const numpadOpen = ref(false)
const numpadTarget = ref("")
const numpadValue = ref("")
const numpadLabel = ref("")

onMounted(async () => {
  try {
    const [b, p, c] = await Promise.all([
      api.get<Branch[]>("/branches"),
      api.get<Product[]>("/products"),
      api.get<Client[]>("/clients"),
    ])
    branches.value = b
    products.value = p
    clients.value = c
    if (user.value?.branchId) branch.value = user.value.branchId
    else if (b.length) branch.value = b[0].id
  } catch (e) {
    console.error(e)
  }
  loadSettings()
})

function openNumpad(target: string, current: string, label: string) {
  numpadTarget.value = target
  numpadValue.value = current
  numpadLabel.value = label
  numpadOpen.value = true
}

function closeNumpad() {
  const v = numpadValue.value
  if (numpadTarget.value === "qtyTaka") qtyTaka.value = v
  else if (numpadTarget.value === "totalHeads") totalHeads.value = v
  else if (numpadTarget.value === "grossKg") grossKg.value = v
  else if (numpadTarget.value === "priceKg") priceKg.value = v
  else if (numpadTarget.value === "qtyHead") qtyHead.value = v
  else if (numpadTarget.value === "priceHead") priceHead.value = v
  else if (numpadTarget.value === "tareKg") tareKg.value = v
  else if (numpadTarget.value === "amountPaid") amountPaid.value = v
  numpadOpen.value = false
}

const selectedProduct = computed(() => products.value.find((p) => p.id === productId.value))
const currentStock = computed(() => selectedProduct.value?.stock?.[branch.value])

const calc = computed(() => {
  const u = unit.value
  if (u === "taka") {
    const baskets = parseFloat(qtyTaka.value) || 0
    const tarePerBasket = kgPerTaka.value
    const gross = parseFloat(grossKg.value) || 0
    const heads = parseFloat(totalHeads.value) || 0
    const price = parseFloat(priceKg.value) || 0
    const netKg = gross - baskets * tarePerBasket
    const total = netKg * price
    const costPerHead = heads > 0 ? total / heads : 0
    return { totalHeads: heads, total, costPerHead, netKg }
  } else if (u === "head") {
    const heads = parseFloat(qtyHead.value) || 0
    const price = parseFloat(priceHead.value) || 0
    const total = heads * price
    return { totalHeads: heads, total, costPerHead: price, netKg: 0 }
  } else {
    const gross = parseFloat(grossKg.value) || 0
    const tare = parseFloat(tareKg.value) || 0
    const price = parseFloat(priceKg.value) || 0
    const netKg = gross - tare
    const total = netKg * price
    return { totalHeads: 0, total, costPerHead: 0, netKg }
  }
})

const remaining = computed(() => calc.value.total - (parseFloat(amountPaid.value) || 0))
const change = computed(() => payStatus.value === "paid" ? Math.max(0, (parseFloat(amountPaid.value) || 0) - calc.value.total) : 0)

const stockWarning = computed(() => {
  if (!currentStock.value) return false
  if (unit.value === "head") return (parseFloat(qtyHead.value) || 0) > currentStock.value.heads
  if (unit.value === "kg") return (parseFloat(grossKg.value) || 0) > currentStock.value.kg
  return (parseFloat(totalHeads.value) || 0) > currentStock.value.heads
})

const clientOptions = computed(() => clients.value.map((c) => ({ id: c.id, label: c.name, sub: c.phone })))
const productOptions = computed(() =>
  products.value.map((p) => ({ id: p.id, label: p.name, sub: `${p.stock?.[branch.value]?.heads ?? 0} ក្បាល` })),
)

function handleProductSelect(id: string, label: string) {
  productId.value = id
  productName.value = label
  const p = products.value.find((x) => x.id === id)
  if (p) {
    priceHead.value = p.defaultPrice.toString()
    priceKg.value = p.defaultPrice.toString()
  }
}

async function submitSale() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      date: new Date().toISOString().slice(0, 10),
      client: clientId.value || clientName.value || "អតិថិជនទូទៅ",
      product: productId.value || productName.value,
      branch: branch.value,
      unit: unit.value,
      qty:
        unit.value === "taka"
          ? parseFloat(qtyTaka.value) || 0
          : unit.value === "head"
            ? parseFloat(qtyHead.value) || 0
            : calc.value.netKg,
      price: unit.value === "head" ? parseFloat(priceHead.value) || 0 : parseFloat(priceKg.value) || 0,
      total: calc.value.total,
      status: payStatus.value,
      paid: parseFloat(amountPaid.value) || 0,
      method: payMethod.value,
      heads:
        unit.value === "kg"
          ? 0
          : unit.value === "head"
            ? parseFloat(qtyHead.value) || 0
            : parseFloat(totalHeads.value) || 0,
      kg: unit.value === "kg" ? calc.value.netKg : unit.value === "taka" ? calc.value.netKg : 0,
      staff: user.value?.username ?? (role.value === "admin" ? "Admin" : "Sale Staff"),
    }
    const res = await api.post<any>("/sales", payload)
    invoiceNo.value = res.invoiceNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចរក្សាទុកការលក់បាន")
  } finally {
    saving.value = false
  }
}

function resetForm() {
  step.value = 1
  saved.value = false
  invoiceNo.value = ""
  clientId.value = ""
  clientName.value = ""
  productId.value = ""
  productName.value = ""
  amountPaid.value = ""
  note.value = ""
}
</script>

<template>
  <div v-if="saved">
    <SuccessScreen
      title="ការលក់ជោគជ័យ!"
      :invoiceNo="invoiceNo"
      :rows="[
        { label: 'អតិថិជន', value: clientName || 'ម៉ូយ ចាន់ណា' },
        { label: 'ផលិតផល', value: productName || 'មាន់ស្រែ' },
        { label: 'តម្លៃសរុប', value: `$${calc.total.toFixed(2)}` },
        { label: 'បានបង់', value: `$${(parseFloat(amountPaid) || 0).toFixed(2)}` },
        { label: 'ជំពាក់', value: `$${Math.max(0, remaining).toFixed(2)}` },
      ]"
      :status="payStatus"
      newLabel="លក់ថ្មី"
      @new="resetForm"
      @view="router.push('/dashboard')"
    />
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <PageHeader title="លក់ថ្មី" :onBack="() => step === 1 ? router.push('/dashboard') : step = 1" />
    <StepIndicator :step="step" :steps="['ព័ត៌មានលក់', 'ការទូទាត់']" />

    <div v-if="step === 1" class="space-y-5 pb-28">
      <Card v-if="role === 'admin'">
        <SectionLabel>សាខា</SectionLabel>
        <SearchDropdown
          :options="branches.map(b => ({ id: b.id, label: b.name }))"
          :value="branch"
          placeholder="ជ្រើសរើសសាខា"
          label="សាខា"
          @change="(id) => branch = id"
        />
      </Card>

      <Card>
        <SectionLabel>អតិថិជន</SectionLabel>
        <SearchDropdown
          :options="clientOptions"
          :value="clientId"
          placeholder="ស្វែងរកអតិថិជន..."
          label="អតិថិជន"
          @change="(id, label) => { clientId = id; clientName = label }"
        />
        <div v-if="clientId" class="mt-3">
          <div v-if="clients.find(x => x.id === clientId)?.debt" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-[#b91c1c] font-medium">ជំពាក់ប្រាក់ចាស់</span>
            <span class="font-bold text-[#dc2626]">${{ clients.find(x => x.id === clientId)!.debt.toLocaleString() }}</span>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>ផលិតផល</SectionLabel>
        <SearchDropdown
          :options="productOptions"
          :value="productId"
          placeholder="ស្វែងរកផលិតផល..."
          label="ផលិតផល"
          @change="handleProductSelect"
        />
        <div v-if="currentStock" class="mt-3">
          <StockInfoCard
            :branch="branches.find(b2 => b2.id === branch)?.name ?? branch"
            :heads="currentStock.heads"
            :kg="currentStock.kg"
            :warning="currentStock.heads < 150"
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>ប្រភេទការគណនា</SectionLabel>
        <UnitSelector :value="unit" @change="(u) => unit = u" />
      </Card>

      <Card>
        <SectionLabel>ចំនួន និង តម្លៃ</SectionLabel>

        <div v-if="unit === 'taka'" class="space-y-4">
          <FormField label="ចំនួនតាការ (កន្ត្រក)" v-model:value="qtyTaka" placeholder="0" required @numpadOpen="openNumpad('qtyTaka', qtyTaka, 'ចំនួនតាការ')" />
          <FormField label="ចំនួនក្បាលសរុប" v-model:value="totalHeads" placeholder="0" @numpadOpen="openNumpad('totalHeads', totalHeads, 'ចំនួនក្បាលសរុប')" />
          <FormField label="ទម្ងន់សរុប (Gross Kg)" v-model:value="grossKg" placeholder="0.0" required @numpadOpen="openNumpad('grossKg', grossKg, 'Gross Kg')" />
          <FormField label="តម្លៃ/គីឡូ ($)" v-model:value="priceKg" placeholder="0.00" required @numpadOpen="openNumpad('priceKg', priceKg, 'តម្លៃ/គីឡូ')" />
          <div class="space-y-2 pt-2">
            <CalcRow label="តាការ" :value="`${(parseFloat(qtyTaka) || 0) * kgPerTaka} គីឡូ`" />
            <CalcRow label="ទម្ងន់សុទ្ធ (Net Kg)" :value="`${calc.netKg.toFixed(2)} គីឡូ`" />
            <CalcRow label="ក្បាលសរុប" :value="`${calc.totalHeads.toLocaleString()} ក្បាល`" />
            <CalcRow label="តម្លៃ/ក្បាល" :value="`$${calc.costPerHead.toFixed(2)}`" />
            <CalcRow label="តម្លៃសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
          </div>
        </div>

        <div v-if="unit === 'head'" class="space-y-4">
          <FormField label="ចំនួនក្បាល" v-model:value="qtyHead" placeholder="0" required @numpadOpen="openNumpad('qtyHead', qtyHead, 'ចំនួនក្បាល')" />
          <FormField label="តម្លៃក្នុងមួយក្បាល ($)" v-model:value="priceHead" placeholder="0.00" required @numpadOpen="openNumpad('priceHead', priceHead, 'តម្លៃ/ក្បាល')" />
          <CalcRow label="តម្លៃសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
        </div>

        <div v-if="unit === 'kg'" class="space-y-4">
          <FormField label="ទម្ងន់សរុប (Gross Kg)" v-model:value="grossKg" placeholder="0.0" required @numpadOpen="openNumpad('grossKg', grossKg, 'ទម្ងន់សរុប')" />
          <FormField label="ទម្ងន់ស្រការ (Tare Kg)" v-model:value="tareKg" placeholder="0.0" @numpadOpen="openNumpad('tareKg', tareKg, 'ទម្ងន់ស្រការ')" />
          <CalcRow label="ទម្ងន់សុទ្ធ (Net Kg)" :value="`${calc.netKg.toFixed(2)} គីឡូ`" />
          <FormField label="តម្លៃក្នុងមួយគីឡូ ($)" v-model:value="priceKg" placeholder="0.00" required @numpadOpen="openNumpad('priceKg', priceKg, 'តម្លៃ/គីឡូ')" />
          <div class="space-y-2 pt-2">
            <CalcRow label="Net Kg × តម្លៃ" :value="`${calc.netKg.toFixed(1)} × $${parseFloat(priceKg || '0').toFixed(2)}`" />
            <CalcRow label="តម្លៃសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
          </div>
        </div>

        <div v-if="stockWarning" class="mt-3 bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 flex items-center gap-2">
          <span class="text-[#dc2626] font-bold">⛔</span>
          <span class="text-sm text-[#b91c1c] font-medium">លើសស្តុក! មិនអនុញ្ញាតឱ្យលក់</span>
        </div>
      </Card>
    </div>

    <div v-if="step === 2" class="space-y-5 pb-28">
      <StockInfoCard
        v-if="currentStock"
        :branch="branches.find(b2 => b2.id === branch)?.name ?? branch"
        :heads="currentStock.heads"
        :kg="currentStock.kg"
        :warning="currentStock.heads < 150"
      />

      <Card>
        <SectionLabel>សង្ខេបការលក់</SectionLabel>
        <div class="space-y-2">
          <CalcRow label="អតិថិជន" :value="clientName || '—'" />
          <CalcRow label="ផលិតផល" :value="productName || '—'" />
          <CalcRow v-if="unit === 'taka'" label="ក្បាលសរុប" :value="`${calc.totalHeads} ក្បាល`" />
          <CalcRow v-if="unit === 'taka' || unit === 'kg'" label="ទម្ងន់សុទ្ធ" :value="`${calc.netKg.toFixed(2)} គីឡូ`" />
          <CalcRow label="តម្លៃសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
        </div>
      </Card>

      <Card>
        <SectionLabel>ស្ថានភាពបង់ប្រាក់</SectionLabel>
        <PaymentStatusSelector :value="payStatus" @change="payStatus = $event" />
      </Card>

      <Card>
        <SectionLabel>របៀបបង់ប្រាក់</SectionLabel>
        <PaymentMethodSelector :value="payMethod" @change="payMethod = $event" />
      </Card>

      <Card>
        <SectionLabel>ចំនួនប្រាក់</SectionLabel>
        <div class="space-y-4">
          <FormField label="ប្រាក់ដែលទទួលបាន ($)" v-model:value="amountPaid" placeholder="0.00" @numpadOpen="openNumpad('amountPaid', amountPaid, 'ប្រាក់ទទួល')" />
          <CalcRow v-if="payStatus === 'paid' && parseFloat(amountPaid) >= calc.total" label="ប្រាក់អាប់" :value="`$${change.toFixed(2)}`" />
          <CalcRow v-if="payStatus !== 'paid'" label="ប្រាក់ជំពាក់" :value="`$${Math.max(0, remaining).toFixed(2)}`" highlight />
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
            <textarea v-model="note" rows="2" placeholder="កំណត់ចំណាំបន្ថែម..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
          </div>
        </div>
      </Card>
    </div>

    <StickyActionBar
      :total="`$${calc.total.toFixed(2)}`"
      totalLabel="តម្លៃសរុប"
      :saveLabel="step === 1 ? 'ទៅទំព័របន្ទាប់' : 'បញ្ជាក់ការលក់'"
      :disabled="stockWarning || (step === 1 && !productId)"
      :onBack="step === 2 ? () => step = 1 : undefined"
      @save="step === 1 ? (amountPaid = calc.total.toString(), step = 2) : submitSale()"
    />

    <NumpadModal :isOpen="numpadOpen" :value="numpadValue" :label="numpadLabel" @update:value="numpadValue = $event" @close="closeNumpad" />
  </div>
</template>
