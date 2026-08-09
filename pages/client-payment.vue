<script setup lang="ts">
import type { Client, Invoice } from "~/utils/data"
import { isTouchDevice } from "~/composables/useTouch"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const route = useRoute()
const api = useApi()
const isTouch = isTouchDevice()

const step = ref(1)
const saved = ref(false)
const saving = ref(false)

const clients = ref<Client[]>([])
const receiptNo = ref("")

const clientId = ref("")
const clientName = ref("")
const selectedInvoice = ref<Invoice | null>(null)
const payMethod = ref<"cash" | "bank">("cash")
const amountPaid = ref("")
const payDate = ref(new Date().toISOString().slice(0, 10))
const note = ref("")

const numpadOpen = ref(false)
const numpadValue = ref("")

const invoices = ref<Invoice[]>([])

const client = computed(() => clients.value.find((c) => c.id === clientId.value))
const unpaidInvoices = computed(() => invoices.value.filter((i) => i.status !== "paid"))

const paidNum = computed(() => parseFloat(amountPaid.value) || 0)
const remaining = computed(() => (selectedInvoice.value ? selectedInvoice.value.remaining - paidNum.value : 0))

const clientOptions = computed(() =>
  clients.value
    .filter((c) => c.debt > 0)
    .map((c) => ({
      id: c.id,
      label: c.name,
      sub: `ជំពាក់ $${c.debt.toLocaleString()} · ${c.invoices} វិក្កយបត្រ`,
    })),
)

onMounted(async () => {
  try {
    clients.value = await api.get<Client[]>("/clients")
    const preset = route.query.client as string | undefined
    if (preset) {
      const c = clients.value.find((x) => x.id === preset)
      if (c && c.debt > 0) await selectClient(c.id, c.name)
    }
  } catch (e) {
    console.error(e)
  }
})

async function selectClient(id: string, label: string) {
  clientId.value = id
  clientName.value = label
  selectedInvoice.value = null
  try {
    const res = await api.get<{ invoices: Invoice[] }>(`/clients/${id}`)
    invoices.value = res.invoices ?? []
  } catch (e) {
    console.error(e)
  }
}

async function submitPayment() {
  if (saving.value || !selectedInvoice.value) return
  saving.value = true
  try {
    const res = await api.post<any>("/payments/client", {
      clientId: clientId.value,
      invoiceId: selectedInvoice.value.id,
      amount: paidNum.value,
      method: payMethod.value,
      date: payDate.value,
      note: note.value,
    })
    receiptNo.value = res.receiptNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចទទួលលុយបាន")
  } finally {
    saving.value = false
  }
}

function resetForm() {
  step.value = 1
  saved.value = false
  receiptNo.value = ""
  clientId.value = ""
  clientName.value = ""
  selectedInvoice.value = null
  amountPaid.value = ""
  invoices.value = []
  note.value = ""
}
</script>

<template>
  <div v-if="saved && selectedInvoice">
    <SuccessScreen
      title="ទទួលលុយជោគជ័យ!"
      :invoiceNo="receiptNo"
      :rows="[
        { label: 'អតិថិជន', value: clientName },
        { label: 'វិក្កយបត្រ', value: selectedInvoice.invoiceNo },
        { label: 'ចំនួនបង់', value: `$${paidNum.toFixed(2)}` },
        { label: 'ជំពាក់នៅសល់', value: `$${Math.max(0, remaining).toFixed(2)}` },
      ]"
      :status="paidNum >= selectedInvoice.remaining ? 'paid' : 'partial'"
      newLabel="ទទួលលុយថ្មី"
      @new="resetForm"
      @view="router.push('/client-debt')"
    />
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <PageHeader title="ទទួលលុយម៉ូយ" :onBack="() => step === 1 ? router.push('/dashboard') : step = 1" />
    <StepIndicator :step="step" :steps="['ជ្រើសសំណង', 'ទំហំប្រាក់']" />

    <div v-if="step === 1" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ជ្រើសអតិថិជន</SectionLabel>
        <SearchDropdown
          :options="clientOptions"
          :value="clientId"
          placeholder="ស្វែងរកអតិថិជន..."
          label="អតិថិជន"
          @change="selectClient"
        />
        <div v-if="client" class="mt-3 bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 flex items-center justify-between">
          <span class="text-sm text-[#b91c1c] font-semibold">ជំពាក់សរុប</span>
          <span class="text-xl font-bold text-[#dc2626]">${{ client.debt.toLocaleString() }}</span>
        </div>
      </Card>

      <Card v-if="clientId && unpaidInvoices.length > 0">
        <SectionLabel>ជ្រើសសំណង</SectionLabel>
        <div class="space-y-3">
          <button
            v-for="inv in unpaidInvoices"
            :key="inv.id"
            type="button"
            @click="selectedInvoice = inv"
            class="w-full text-left p-4 rounded-xl border-2 transition-all"
            :class="selectedInvoice?.id === inv.id ? 'border-[#00b4c8] bg-[#e0f9fb]' : 'border-gray-200 bg-white hover:border-gray-300'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-bold text-sm text-gray-800">{{ inv.invoiceNo }}</span>
                  <StatusBadge :status="inv.status" />
                </div>
                <div class="text-xs text-gray-500">{{ inv.product }} · {{ inv.date }}</div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-base font-bold text-[#dc2626]">${{ inv.remaining.toFixed(0) }}</div>
                <div class="text-xs text-gray-400">ជំពាក់</div>
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>សរុប: ${{ inv.total.toFixed(0) }}</span>
              <span>បង់ហើយ: ${{ inv.paid.toFixed(0) }}</span>
            </div>
          </button>
        </div>
      </Card>

      <Card v-if="clientId && unpaidInvoices.length === 0">
        <div class="text-center py-8">
          <div class="text-4xl mb-3">✅</div>
          <p class="font-bold text-[#16a34a]">គ្មានជំពាក់</p>
          <p class="text-sm text-gray-400 mt-1">អតិថិជននេះបានបង់រួចរាល់</p>
        </div>
      </Card>
    </div>

    <div v-if="step === 2 && selectedInvoice" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>សំណងដែលជ្រើស</SectionLabel>
        <div class="space-y-2">
          <CalcRow label="អតិថិជន" :value="clientName" />
          <CalcRow label="វិក្កយបត្រ" :value="selectedInvoice.invoiceNo" />
          <CalcRow label="ផលិតផល" :value="selectedInvoice.product" />
          <CalcRow label="តម្លៃសរុប" :value="`$${selectedInvoice.total.toFixed(2)}`" />
          <CalcRow label="បង់ហើយ" :value="`$${selectedInvoice.paid.toFixed(2)}`" />
          <CalcRow label="ជំពាក់នៅសល់" :value="`$${selectedInvoice.remaining.toFixed(2)}`" highlight />
        </div>
      </Card>

      <Card>
        <SectionLabel>ការទូទាត់</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃទទួល</label>
            <input type="date" v-model="payDate" class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base" />
          </div>
          <PaymentMethodSelector :value="payMethod" @change="payMethod = $event" />
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
            ជំពាក់: ${{ selectedInvoice.remaining.toFixed(2) }}
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in ['7','8','9','4','5','6','1','2','3','.','0','⌫']"
            :key="k"
            type="button"
            @pointerdown.prevent="
              k === '⌫' ? amountPaid = amountPaid.slice(0, -1)
              : k === '.' ? (!amountPaid.includes('.') && (amountPaid += '.'))
              : amountPaid = amountPaid === '0' ? k : amountPaid + k
            "
            class="h-14 rounded-xl text-xl font-bold transition-all active:scale-95"
            :class="k === '⌫' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-white text-[#0f2a4a] shadow-sm border border-gray-100 hover:bg-[#e0f9fb]'"
          >
            {{ k }}
          </button>
        </div>

        <div class="flex gap-2 mt-3">
          <button
            @click="amountPaid = selectedInvoice.remaining.toString()"
            class="flex-1 py-2.5 rounded-xl bg-[#dcfce7] text-[#15803d] font-semibold text-sm hover:bg-[#bbf7d0] transition-colors"
          >
            បង់ទាំងអស់
          </button>
          <button
            @click="amountPaid = (selectedInvoice.remaining / 2).toFixed(2)"
            class="flex-1 py-2.5 rounded-xl bg-[#fff7ed] text-[#c2410c] font-semibold text-sm hover:bg-[#fed7aa] transition-colors"
          >
            បង់កន្លះ
          </button>
        </div>
      </Card>

      <Card v-if="paidNum > 0">
        <SectionLabel>សង្ខេបការទូទាត់</SectionLabel>
        <div class="space-y-2">
          <CalcRow label="ចំនួនបង់" :value="`$${paidNum.toFixed(2)}`" />
          <CalcRow
            :label="remaining <= 0 ? 'បង់រួចហើយ ✓' : 'ជំពាក់នៅ'"
            :value="remaining <= 0 ? 'ទូទាត់ហើយ' : `$${remaining.toFixed(2)}`"
            highlight
          />
        </div>
      </Card>

      <Card>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
        <textarea v-model="note" rows="2" placeholder="..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
      </Card>
    </div>

    <StickyActionBar
      :total="step === 2 ? `$${paidNum.toFixed(2)}` : `$${selectedInvoice?.remaining.toFixed(2) ?? '0'}`"
      :totalLabel="step === 2 ? 'ចំនួនបង់' : 'ជំពាក់'"
      :saveLabel="step === 1 ? 'ជ្រើសសំណង' : 'បញ្ជាក់ការទូទាត់'"
      :disabled="step === 1 ? !selectedInvoice : paidNum <= 0"
      :onBack="step === 2 ? () => step = 1 : undefined"
      @save="step === 1 ? (selectedInvoice ? step = 2 : null) : submitPayment()"
    />
  </div>
</template>
