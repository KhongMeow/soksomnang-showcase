<script setup lang="ts">
import type { Supplier, Purchase } from "~/utils/data"
import { isTouchDevice } from "~/composables/useTouch"

definePageMeta({ middleware: ["auth", "admin"] })

const router = useRouter()
const api = useApi()
const isTouch = isTouchDevice()

const step = ref(1)
const saved = ref(false)
const saving = ref(false)

const suppliers = ref<Supplier[]>([])
const purchases = ref<Purchase[]>([])
const receiptNo = ref("")

const supplierId = ref("")
const supplierName = ref("")
const selectedPurchase = ref<Purchase | null>(null)
const payMethod = ref<"cash" | "bank">("cash")
const amountPaid = ref("")
const payDate = ref(new Date().toISOString().slice(0, 10))
const note = ref("")

const supplier = computed(() => suppliers.value.find((s) => s.id === supplierId.value))
const unpaidPurchases = computed(() =>
  purchases.value.filter((p) => p.status !== "paid"),
)

const paidNum = computed(() => parseFloat(amountPaid.value) || 0)
const remaining = computed(() =>
  selectedPurchase.value
    ? selectedPurchase.value.remaining - paidNum.value
    : 0,
)

const supplierOptions = computed(() =>
  suppliers.value
    .filter((s) => s.debt > 0)
    .map((s) => ({
      id: s.id,
      label: s.name,
      sub: `ជំពាក់ $${s.debt.toLocaleString()} · ទិញសរុប $${s.totalPurchase.toLocaleString()}`,
    })),
)

onMounted(async () => {
  try {
    suppliers.value = await api.get<Supplier[]>("/suppliers")
  } catch (e) {
    console.error(e)
  }
})

async function selectSupplier(id: string, label: string) {
  supplierId.value = id
  supplierName.value = label
  selectedPurchase.value = null
  try {
    const list = await api.get<Purchase[]>("/purchases")
    purchases.value = list.filter((p) => p.supplier === label)
  } catch (e) {
    console.error(e)
  }
}

async function submitPayment() {
  if (saving.value || !selectedPurchase.value) return
  saving.value = true
  try {
    const res = await api.post<any>("/payments/supplier", {
      supplierId: supplierId.value,
      purchaseId: selectedPurchase.value.id,
      amount: paidNum.value,
      method: payMethod.value,
      date: payDate.value,
      note: note.value,
    })
    receiptNo.value = res.receiptNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចទូទាត់ Supplier បាន")
  } finally {
    saving.value = false
  }
}

function handleSave() {
  if (step.value === 1) {
    if (selectedPurchase.value) step.value = 2
  } else {
    submitPayment()
  }
}

function resetForm() {
  step.value = 1
  saved.value = false
  receiptNo.value = ""
  supplierId.value = ""
  supplierName.value = ""
  selectedPurchase.value = null
  amountPaid.value = ""
  payDate.value = new Date().toISOString().slice(0, 10)
  payMethod.value = "cash"
  note.value = ""
  purchases.value = []
}
</script>

<template>
  <div v-if="saved && selectedPurchase">
    <SuccessScreen
      title="ទូទាត់ Supplier ជោគជ័យ!"
      :invoiceNo="receiptNo"
      :rows="[
        { label: 'Supplier', value: supplierName },
        { label: 'វិក្កយបត្រ', value: selectedPurchase.invoiceNo },
        { label: 'ចំនួនបង់', value: `$${paidNum.toFixed(2)}` },
        { label: 'ជំពាក់នៅសល់', value: `$${Math.max(0, remaining).toFixed(2)}` },
      ]"
      :status="paidNum >= selectedPurchase.remaining ? 'paid' : 'partial'"
      newLabel="ទទួលលុយថ្មី"
      @new="resetForm"
      @view="router.push('/supplier-debt')"
    />
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <PageHeader
      title="ទូទាត់ Supplier"
      :onBack="() => (step === 1 ? router.push('/dashboard') : (step = 1))"
    />
    <StepIndicator
      :step="step"
      :steps="['ជ្រើស Supplier', 'ការទូទាត់']"
    />

    <div v-if="step === 1" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ជ្រើស Supplier</SectionLabel>
        <SearchDropdown
          :options="supplierOptions"
          :value="supplierId"
          placeholder="ស្វែងរក Supplier..."
          label="Supplier"
          @change="selectSupplier"
        />
        <div
          v-if="supplier"
          class="mt-3 bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span class="text-sm text-[#b91c1c] font-semibold">ជំពាក់សរុប</span>
          <span class="text-xl font-bold text-[#dc2626]">${{ supplier.debt.toLocaleString() }}</span>
        </div>
      </Card>

      <Card v-if="supplierId && unpaidPurchases.length > 0">
        <SectionLabel>ជ្រើសវិក្កយបត្រ</SectionLabel>
        <div class="space-y-3">
          <button
            v-for="p in unpaidPurchases"
            :key="p.id"
            type="button"
            @click="selectedPurchase = p"
            class="w-full text-left p-4 rounded-xl border-2 transition-all"
            :class="
              selectedPurchase?.id === p.id
                ? 'border-[#00b4c8] bg-[#e0f9fb]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-bold text-sm text-gray-800">{{ p.invoiceNo }}</span>
                  <StatusBadge :status="p.status" />
                </div>
                <div class="text-xs text-gray-500">{{ p.product }} · {{ p.date }}</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ p.heads }} ក្បាល · {{ p.kg }} គីឡូ
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-base font-bold text-[#dc2626]">${{ p.remaining.toFixed(0) }}</div>
                <div class="text-xs text-gray-400">ជំពាក់</div>
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>សរុប: ${{ p.total.toFixed(0) }}</span>
              <span>បង់ហើយ: ${{ p.paid.toFixed(0) }}</span>
            </div>
          </button>
        </div>
      </Card>

      <Card v-if="supplierId && unpaidPurchases.length === 0">
        <div class="text-center py-8">
          <div class="text-4xl mb-3">✅</div>
          <p class="font-bold text-[#16a34a]">គ្មានជំពាក់</p>
          <p class="text-sm text-gray-400 mt-1">Supplier នេះបានបង់រួចរាល់</p>
        </div>
      </Card>
    </div>

    <div v-if="step === 2 && selectedPurchase" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>វិក្កយបត្រដែលជ្រើស</SectionLabel>
        <div class="space-y-2">
          <CalcRow label="Supplier" :value="supplierName" />
          <CalcRow label="វិក្កយបត្រ" :value="selectedPurchase.invoiceNo" />
          <CalcRow label="ផលិតផល" :value="selectedPurchase.product" />
          <CalcRow
            label="តម្លៃសរុប"
            :value="`$${selectedPurchase.total.toFixed(2)}`"
          />
          <CalcRow
            label="បង់ហើយ"
            :value="`$${selectedPurchase.paid.toFixed(2)}`"
          />
          <CalcRow
            label="ជំពាក់នៅសល់"
            :value="`$${selectedPurchase.remaining.toFixed(2)}`"
            highlight
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>ការទូទាត់</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃទូទាត់</label>
            <input
              type="date"
              v-model="payDate"
              class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base"
            />
          </div>
          <PaymentMethodSelector
            :value="payMethod"
            @change="payMethod = $event"
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>បញ្ចូលចំនួនប្រាក់</SectionLabel>
        <div class="bg-[#0f2a4a] rounded-2xl px-4 py-3 mb-4">
          <input
            :value="amountPaid"
            inputmode="decimal"
            :readonly="isTouch"
            @input="amountPaid = ($event.target as HTMLInputElement).value"
            placeholder="0"
            class="w-full bg-transparent text-right text-3xl font-bold text-white min-h-[44px] outline-none placeholder:text-white/40"
          />
          <div class="text-right text-xs text-[#00b4c8] mt-1">
            ជំពាក់: ${{ selectedPurchase.remaining.toFixed(2) }}
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in ['7','8','9','4','5','6','1','2','3','.','0','⌫']"
            :key="k"
            type="button"
            @pointerdown.prevent="
              k === '⌫'
                ? (amountPaid = amountPaid.slice(0, -1))
                : k === '.'
                  ? !amountPaid.includes('.') && (amountPaid += '.')
                  : (amountPaid =
                      amountPaid === '0' ? k : amountPaid + k)
            "
            class="h-14 rounded-xl text-xl font-bold transition-all active:scale-95"
            :class="
              k === '⌫'
                ? 'bg-[#fef2f2] text-[#dc2626]'
                : 'bg-white text-[#0f2a4a] shadow-sm border border-gray-100 hover:bg-[#e0f9fb]'
            "
          >
            {{ k }}
          </button>
        </div>

        <div class="flex gap-2 mt-3">
          <button
            @click="amountPaid = selectedPurchase.remaining.toString()"
            class="flex-1 py-2.5 rounded-xl bg-[#dcfce7] text-[#15803d] font-semibold text-sm hover:bg-[#bbf7d0] transition-colors"
          >
            បង់ទាំងអស់
          </button>
          <button
            @click="amountPaid = (selectedPurchase.remaining / 2).toFixed(2)"
            class="flex-1 py-2.5 rounded-xl bg-[#fff7ed] text-[#c2410c] font-semibold text-sm hover:bg-[#fed7aa] transition-colors"
          >
            បង់កន្លះ
          </button>
        </div>
      </Card>

      <Card v-if="paidNum > 0">
        <SectionLabel>សង្ខេបការទូទាត់</SectionLabel>
        <div class="space-y-2">
          <CalcRow
            label="ចំនួនបង់"
            :value="`$${paidNum.toFixed(2)}`"
          />
          <CalcRow
            :label="remaining <= 0 ? 'បង់រួចហើយ ✓' : 'ជំពាក់នៅ'"
            :value="
              remaining <= 0
                ? 'ទូទាត់ហើយ'
                : `$${remaining.toFixed(2)}`
            "
            highlight
          />
        </div>
      </Card>

      <Card>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
        <textarea
          v-model="note"
          rows="2"
          placeholder="..."
          class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none"
        />
      </Card>
    </div>

    <StickyActionBar
      :total="
        step === 2
          ? `$${paidNum.toFixed(2)}`
          : `$${selectedPurchase?.remaining.toFixed(2) ?? '0'}`
      "
      :totalLabel="step === 2 ? 'ចំនួនបង់' : 'ជំពាក់'"
      :saveLabel="
        step === 1 ? 'បន្តទៅការទូទាត់' : 'បញ្ជាក់ការទូទាត់'
      "
      :disabled="step === 1 ? !selectedPurchase : paidNum <= 0"
      :onBack="step === 2 ? () => (step = 1) : undefined"
      @save="handleSave"
    />
  </div>
</template>
