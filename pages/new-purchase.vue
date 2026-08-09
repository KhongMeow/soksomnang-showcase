<script setup lang="ts">
import type { Unit, PayStatus, Supplier, Product, Branch } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()
const { role, user } = useAuth()
const { kgPerTaka, load: loadSettings } = useSettings()

const isStaff = computed(() => role.value === "sale_staff")

const step = ref(1)
const saved = ref(false)
const saving = ref(false)

watch(saved, (v) => {
  if (v) window.scrollTo({ top: 0 })
})

const suppliers = ref<Supplier[]>([])
const products = ref<Product[]>([])
const branches = ref<Branch[]>([])
const invoiceNo = ref("")
const requestNo = ref("")

const supplierId = ref("")
const supplierName = ref("")
const productId = ref("")
const productName = ref("")
const branch = ref("")
const sourceBranch = ref("")
const allBranches = ref<Branch[]>([])
const unit = ref<Unit>("taka")
const date = ref(new Date().toISOString().slice(0, 10))

const qtyTaka = ref("")
const totalHeads = ref("")
const grossKg = ref("")
const priceKg = ref("")

const qtyHead = ref("")
const priceHead = ref("")
const headKg = ref("")

const tareKg = ref("")
const actualHeads = ref("")

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
    const [s, p, b, all] = await Promise.all([
      api.get<Supplier[]>("/suppliers"),
      api.get<Product[]>("/products"),
      api.get<Branch[]>("/branches"),
      isStaff.value ? api.get<Branch[]>("/branches/all") : Promise.resolve<Branch[]>([]),
    ])
    suppliers.value = s
    products.value = p
    branches.value = b
    allBranches.value = all
    if (user.value?.branchId) branch.value = user.value.branchId
    else if (b.length) branch.value = b[0].id
    sourceBranch.value = defaultSourceBranch()
  } catch (e) {
    console.error(e)
  }
  loadSettings()
})

function defaultSourceBranch() {
  if (!isStaff.value) return ""
  const own = user.value?.branchId
  const preferred = allBranches.value.find((x) => x.name.toLowerCase().includes("central"))
  if (preferred && preferred.id !== own) return preferred.id
  return allBranches.value.find((x) => x.id !== own)?.id ?? ""
}

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
  else if (numpadTarget.value === "headKg") headKg.value = v
  else if (numpadTarget.value === "tareKg") tareKg.value = v
  else if (numpadTarget.value === "actualHeads") actualHeads.value = v
  else if (numpadTarget.value === "amountPaid") amountPaid.value = v
  numpadOpen.value = false
}

const calc = computed(() => {
  if (unit.value === "taka") {
    const baskets = parseFloat(qtyTaka.value) || 0
    const tarePerBasket = kgPerTaka.value
    const gross = parseFloat(grossKg.value) || 0
    const heads = parseFloat(totalHeads.value) || 0
    const price = parseFloat(priceKg.value) || 0
    const netKg = gross - baskets * tarePerBasket
    const total = netKg * price
    const costPerHead = heads > 0 ? total / heads : 0
    return { totalHeads: heads, total, costPerHead, netKg, costPerKg: price }
  } else if (unit.value === "head") {
    const heads = parseFloat(qtyHead.value) || 0
    const price = parseFloat(priceHead.value) || 0
    const total = heads * price
    const kg = parseFloat(headKg.value) || 0
    return { totalHeads: heads, total, costPerHead: price, netKg: kg, costPerKg: 0 }
  } else {
    const gross = parseFloat(grossKg.value) || 0
    const tare = parseFloat(tareKg.value) || 0
    const price = parseFloat(priceKg.value) || 0
    const netKg = gross - tare
    const total = netKg * price
    return { totalHeads: parseFloat(actualHeads.value) || 0, total, costPerHead: 0, netKg, costPerKg: price }
  }
})

const remaining = computed(() => calc.value.total - (parseFloat(amountPaid.value) || 0))
const supplierOptions = computed(() => suppliers.value.map((s) => ({ id: s.id, label: s.name, sub: s.phone })))
const productOptions = computed(() => products.value.map((p) => ({ id: p.id, label: p.name })))

async function submitPurchase() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      date: date.value,
      supplier: supplierId.value || supplierName.value,
      product: productId.value || productName.value,
      branch: branch.value,
      heads:
        unit.value === "head"
          ? parseFloat(qtyHead.value) || 0
          : parseFloat(totalHeads.value) || 0,
      kg: calc.value.netKg,
      total: calc.value.total,
      status: payStatus.value,
      paid: parseFloat(amountPaid.value) || 0,
      note: note.value,
    }
    const res = await api.post<any>("/purchases", payload)
    invoiceNo.value = res.invoiceNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចរក្សាទុកការទិញបាន")
  } finally {
    saving.value = false
  }
}

async function submitRequest() {
  if (saving.value) return
  saving.value = true
  try {
    const res = await api.post<any>("/purchase-requests", {
      date: date.value,
      product: productId.value || productName.value,
      branchId: branch.value,
      sourceBranchId: sourceBranch.value,
      heads:
        unit.value === "head"
          ? parseFloat(qtyHead.value) || 0
          : parseFloat(totalHeads.value) || 0,
      kg: calc.value.netKg,
      note: note.value,
    })
    requestNo.value = res.requestNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចផ្ញើសំណើបាន")
  } finally {
    saving.value = false
  }
}

function resetForm() {
  step.value = 1
  saved.value = false
  invoiceNo.value = ""
  requestNo.value = ""
  supplierId.value = ""
  supplierName.value = ""
  productId.value = ""
  productName.value = ""
  unit.value = "taka"
  date.value = new Date().toISOString().slice(0, 10)
  qtyTaka.value = ""
  totalHeads.value = ""
  grossKg.value = ""
  priceKg.value = ""
  qtyHead.value = ""
  priceHead.value = ""
  headKg.value = ""
  tareKg.value = ""
  actualHeads.value = ""
  payStatus.value = "paid"
  payMethod.value = "cash"
  amountPaid.value = ""
  note.value = ""
  if (user.value?.branchId) branch.value = user.value.branchId
  else if (branches.value.length) branch.value = branches.value[0].id
  sourceBranch.value = defaultSourceBranch()
}
</script>

<template>
  <div v-if="saved && isStaff">
    <SuccessScreen
      title="សំណើបានផ្ញើហើយ!"
      :invoiceNo="requestNo"
      :rows="[
        { label: 'ពី → ទៅ', value: `${allBranches.find(b => b.id === sourceBranch)?.name ?? '—'} → ${branches.find(b => b.id === branch)?.name ?? ''}` },
        { label: 'ផលិតផល', value: productName || '—' },
        { label: 'ក្បាល', value: `${calc.totalHeads.toLocaleString()} ក្បាល` },
        { label: 'គីឡូ', value: `${calc.netKg.toFixed(2)} គីឡូ` },
        { label: 'ស្ថានភាព', value: 'រង់ចាំ Admin យល់ព្រម' },
      ]"
      newLabel="ស្នើសុំថ្មី"
      @new="resetForm"
      @view="router.push('/dashboard')"
    />
  </div>

  <div v-else-if="saved">
    <SuccessScreen
      title="ទិញចូលជោគជ័យ!"
      :invoiceNo="invoiceNo"
      :rows="[
        { label: 'Supplier', value: supplierName || '—' },
        { label: 'ផលិតផល', value: productName || '—' },
        { label: 'ក្បាលសរុប', value: `${calc.totalHeads.toLocaleString()} ក្បាល` },
        { label: 'ទម្ងន់សុទ្ធ', value: `${calc.netKg.toFixed(2)} គីឡូ` },
        { label: 'Cost/ក្បាល', value: `$${calc.costPerHead.toFixed(2)}` },
        { label: 'ចំណាយសរុប', value: `$${calc.total.toFixed(2)}` },
        { label: 'បានបង់', value: `$${(parseFloat(amountPaid) || 0).toFixed(2)}` },
        { label: 'ជំពាក់ Supplier', value: `$${Math.max(0, remaining).toFixed(2)}` },
      ]"
      :status="payStatus"
      newLabel="ទិញចូលថ្មី"
      @new="resetForm"
      @view="router.push('/stock')"
    />
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <PageHeader :title="isStaff ? 'ស្នើសុំស្តុក' : 'ទិញចូលថ្មី'" :onBack="() => step === 1 ? router.push('/dashboard') : step = 1" />
    <StepIndicator :step="step" :steps="isStaff ? ['ព័ត៌មានទិញ'] : ['ព័ត៌មានទិញ', 'ការទូទាត់']" />

    <div v-if="step === 1" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ព័ត៌មានទូទៅ</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃទិញចូល</label>
            <input type="date" v-model="date" class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base" />
          </div>
          <div v-if="!isStaff">
            <SearchDropdown
              :options="branches.map(b => ({ id: b.id, label: b.name }))"
              :value="branch"
              placeholder="ជ្រើសរើសសាខា..."
              label="សាខា"
              @change="(id, label) => branch = id"
            />
          </div>
          <div v-if="isStaff" class="space-y-3">
            <SearchDropdown
              :options="allBranches.filter(x => x.id !== branch).map(b => ({ id: b.id, label: b.name }))"
              :value="sourceBranch"
              placeholder="ជ្រើសសាខាប្រភព..."
              label="ស្នើសុំស្តុកពី"
              @change="(id, label) => sourceBranch = id"
            />
            <div class="bg-[#e0f9fb] border border-[#99e6ef] rounded-xl px-4 py-3 flex items-center justify-between">
              <span class="text-sm text-[#0097a7] font-semibold">ទៅសាខារបស់ខ្ញុំ → {{ branches.find(b => b.id === branch)?.name }}</span>
            </div>
          </div>
          <div v-if="!isStaff">
            <SearchDropdown :options="supplierOptions" :value="supplierId" placeholder="ស្វែងរក Supplier..." label="Supplier" @change="(id, label) => { supplierId = id; supplierName = label }" />
            <div v-if="supplierId" class="bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-4 py-3 flex items-center justify-between">
              <span class="text-sm text-[#c2410c] font-medium">ជំពាក់ Supplier</span>
              <span class="font-bold text-[#ea580c]">${{ suppliers.find(x => x.id === supplierId)?.debt.toLocaleString() ?? '0' }}</span>
            </div>
          </div>
          <SearchDropdown :options="productOptions" :value="productId" placeholder="ស្វែងរកផលិតផល..." label="ប្រភេទមាន់" @change="(id, label) => { productId = id; productName = label }" />
        </div>
      </Card>

      <Card>
        <SectionLabel>ប្រភេទការទិញ</SectionLabel>
        <UnitSelector :value="unit" :show-kg="false" @change="(u) => unit = u" />
      </Card>

      <Card>
        <SectionLabel>{{ isStaff ? 'ចំនួន' : 'ចំនួន និង តម្លៃ' }}</SectionLabel>

        <div v-if="unit === 'taka'" class="space-y-4">
          <FormField label="ចំនួនតាការ" v-model:value="qtyTaka" placeholder="0" required @numpadOpen="openNumpad('qtyTaka', qtyTaka, 'ចំនួនតាការ')" />
          <FormField label="ចំនួនក្បាលសរុប" v-model:value="totalHeads" placeholder="0" @numpadOpen="openNumpad('totalHeads', totalHeads, 'ចំនួនក្បាលសរុប')" />
          <FormField label="ទម្ងន់សរុប (Gross Kg)" v-model:value="grossKg" placeholder="0.0" required @numpadOpen="openNumpad('grossKg', grossKg, 'Gross Kg')" />
          <FormField v-if="!isStaff" label="តម្លៃ/គីឡូ ($)" v-model:value="priceKg" placeholder="0.00" required @numpadOpen="openNumpad('priceKg', priceKg, 'តម្លៃ/គីឡូ')" />
          <div class="space-y-2 pt-2">
            <CalcRow label="តាការ" :value="`${(parseFloat(qtyTaka) || 0) * kgPerTaka} គីឡូ`" />
            <CalcRow label="ទម្ងន់សុទ្ធ (Net Kg)" :value="`${calc.netKg.toFixed(2)} គីឡូ`" />
            <CalcRow label="ក្បាលសរុប" :value="`${calc.totalHeads.toLocaleString()} ក្បាល`" />
            <CalcRow v-if="!isStaff" label="Cost Price / ក្បាល" :value="`$${calc.costPerHead.toFixed(2)}`" />
            <CalcRow v-if="!isStaff" label="ចំណាយសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
          </div>
        </div>

        <div v-if="unit === 'head'" class="space-y-4">
          <FormField label="ចំនួនក្បាល" v-model:value="qtyHead" placeholder="0" required @numpadOpen="openNumpad('qtyHead', qtyHead, 'ចំនួនក្បាល')" />
          <FormField label="ទម្ងន់ (Kg)" v-model:value="headKg" placeholder="0.0" @numpadOpen="openNumpad('headKg', headKg, 'ទម្ងន់')" />
          <FormField v-if="!isStaff" label="តម្លៃ/ក្បាល ($)" v-model:value="priceHead" placeholder="0.00" required @numpadOpen="openNumpad('priceHead', priceHead, 'តម្លៃ/ក្បាល')" />
          <CalcRow v-if="!isStaff" label="ចំណាយសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
        </div>

        <div class="mt-4 border-t border-gray-100 pt-4">
          <div class="bg-[#0f2a4a] rounded-xl p-4 grid grid-cols-2 gap-3" :class="isStaff ? '' : 'sm:grid-cols-4'">
            <div class="text-center">
              <div class="text-white font-bold text-lg">{{ calc.totalHeads.toLocaleString() }}</div>
              <div class="text-[#00b4c8] text-xs mt-0.5">ក្បាលសរុប</div>
            </div>
            <div class="text-center">
              <div class="text-white font-bold text-lg">{{ calc.netKg.toFixed(1) }}</div>
              <div class="text-[#00b4c8] text-xs mt-0.5">គីឡូសុទ្ធ</div>
            </div>
            <div v-if="!isStaff" class="text-center">
              <div class="text-white font-bold text-lg">${{ calc.costPerHead.toFixed(2) }}</div>
              <div class="text-[#00b4c8] text-xs mt-0.5">Cost/ក្បាល</div>
            </div>
            <div v-if="!isStaff" class="text-center">
              <div class="text-white font-bold text-lg">${{ calc.total.toFixed(0) }}</div>
              <div class="text-[#00b4c8] text-xs mt-0.5">ចំណាយសរុប</div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <div v-if="step === 2 && !isStaff" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>សង្ខេបការទិញ</SectionLabel>
        <div class="space-y-2">
          <CalcRow label="Supplier" :value="supplierName || '—'" />
          <CalcRow label="ផលិតផល" :value="productName || '—'" />
          <CalcRow label="ក្បាលសរុប" :value="`${calc.totalHeads.toLocaleString()} ក្បាល`" />
          <CalcRow v-if="unit === 'kg' || unit === 'taka'" label="ទម្ងន់សុទ្ធ" :value="`${calc.netKg.toFixed(2)} គីឡូ`" />
          <CalcRow label="Cost / ក្បាល" :value="`$${calc.costPerHead.toFixed(2)}`" />
          <CalcRow label="ចំណាយសរុប" :value="`$${calc.total.toFixed(2)}`" highlight />
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
          <FormField label="ប្រាក់ដែលបានបង់ ($)" v-model:value="amountPaid" placeholder="0.00" @numpadOpen="openNumpad('amountPaid', amountPaid, 'ប្រាក់បង់')" />
          <CalcRow v-if="payStatus !== 'paid'" label="ជំពាក់ Supplier" :value="`$${Math.max(0, remaining).toFixed(2)}`" highlight />
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
            <textarea v-model="note" rows="2" placeholder="កំណត់ចំណាំបន្ថែម..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
          </div>
        </div>
      </Card>
    </div>

    <StickyActionBar
      :total="isStaff ? `${calc.totalHeads.toLocaleString()} ក្បាល` : `$${calc.total.toFixed(2)}`"
      :totalLabel="isStaff ? 'ស្នើសុំ' : 'ចំណាយសរុប'"
      :saveLabel="isStaff ? 'ផ្ញើសំណើសុំ' : (step === 1 ? 'ទៅទំព័របន្ទាប់' : 'បញ្ជាក់ការទិញ')"
      :disabled="step === 1 && (!productId || (isStaff && calc.totalHeads <= 0))"
      :onBack="step === 2 ? () => step = 1 : undefined"
      @save="isStaff ? submitRequest() : (step === 1 ? (amountPaid = calc.total.toString(), step = 2) : submitPurchase())"
    />

    <NumpadModal :isOpen="numpadOpen" :value="numpadValue" :label="numpadLabel" @update:value="numpadValue = $event" @close="closeNumpad" />
  </div>
</template>
