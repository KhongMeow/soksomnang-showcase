<script setup lang="ts">
import type { Branch, Product } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const route = useRoute()
const api = useApi()
const { role, user } = useAuth()

const isStaff = computed(() => role.value === "sale_staff")
const canChooseFrom = computed(() => role.value === "admin")

const step = ref(1)
const saved = ref(false)
const saving = ref(false)

const branches = ref<Branch[]>([])
const products = ref<Product[]>([])
const transferNo = ref("")

const fromBranch = ref("")
const toBranch = ref("")
const toBranchName = ref("")
const productId = ref("")
const productName = ref("")
const transferHeads = ref("")
const transferKg = ref("")
const date = ref(new Date().toISOString().slice(0, 10))
const note = ref("")

const numpadOpen = ref(false)
const numpadTarget = ref("")
const numpadValue = ref("")
const numpadLabel = ref("")

onMounted(async () => {
  try {
    const [b, p] = await Promise.all([
      api.get<Branch[]>("/branches/all"),
      api.get<Product[]>("/products"),
    ])
    branches.value = b
    products.value = p

    const fromQ = route.query.from as string | undefined
    const toQ = route.query.to as string | undefined
    const productQ = route.query.product as string | undefined
    const headsQ = route.query.heads as string | undefined
    const kgQ = route.query.kg as string | undefined

    if (isStaff.value && !canChooseFrom.value && user.value?.branchId) {
      fromBranch.value = user.value.branchId
    } else if (fromQ && branches.value.some((x) => x.id === fromQ)) {
      fromBranch.value = fromQ
    } else if (b.length) {
      fromBranch.value = b[0].id
    }
    if (toQ) {
      toBranch.value = toQ
      toBranchName.value = branches.value.find((x) => x.id === toQ)?.name ?? toQ
    }
    if (productQ) {
      productId.value = productQ
      productName.value = products.value.find((x) => x.id === productQ)?.name ?? productQ
    }
    if (headsQ) transferHeads.value = headsQ
    if (kgQ) transferKg.value = kgQ
  } catch (e) {
    console.error(e)
  }
})

function openNumpad(target: string, current: string, label: string) {
  numpadTarget.value = target
  numpadValue.value = current
  numpadLabel.value = label
  numpadOpen.value = true
}

function closeNumpad() {
  if (numpadTarget.value === "heads") transferHeads.value = numpadValue.value
  else if (numpadTarget.value === "kg") transferKg.value = numpadValue.value
  numpadOpen.value = false
}

const fromBranchName = computed(() => branches.value.find((b) => b.id === fromBranch.value)?.name ?? fromBranch.value)
const selectedProduct = computed(() => products.value.find((p) => p.id === productId.value))
const currentStock = computed(() => selectedProduct.value?.stock?.[fromBranch.value])
const headsNum = computed(() => parseFloat(transferHeads.value) || 0)
const kgNum = computed(() => parseFloat(transferKg.value) || 0)
const overHead = computed(() => headsNum.value > (currentStock.value?.heads ?? 0))
const overKg = computed(() => kgNum.value > (currentStock.value?.kg ?? 0))
const hasError = computed(() => overHead.value || overKg.value || (fromBranch.value === toBranch.value && toBranch.value !== ""))

const productOptions = computed(() =>
  products.value.map((p) => ({ id: p.id, label: p.name, sub: `${p.stock?.[fromBranch.value]?.heads ?? 0} ក្បាល` })),
)

async function submitTransfer() {
  if (saving.value) return
  saving.value = true
  try {
    const res = await api.post<any>("/transfers", {
      date: date.value,
      from: fromBranch.value,
      to: toBranch.value,
      product: productId.value,
      heads: headsNum.value,
      kg: kgNum.value,
      note: note.value,
    })
    transferNo.value = res.transferNo
    saved.value = true
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចផ្ទេរស្តុកបាន")
  } finally {
    saving.value = false
  }
}

function resetForm() {
  step.value = 1
  saved.value = false
  transferNo.value = ""
  toBranch.value = ""
  toBranchName.value = ""
  productId.value = ""
  productName.value = ""
  transferHeads.value = ""
  transferKg.value = ""
  note.value = ""
}
</script>

<template>
  <div v-if="saved">
    <SuccessScreen
      title="ផ្ទេរស្តុកជោគជ័យ!"
      :invoiceNo="transferNo"
      :rows="[
        { label: 'ផ្ទេរចេញ', value: fromBranchName },
        { label: 'ផ្ទេរទៅ', value: toBranchName || '—' },
        { label: 'ផលិតផល', value: productName || '—' },
        { label: 'ក្បាល', value: `${headsNum.toLocaleString()} ក្បាល` },
        { label: 'គីឡូ', value: `${kgNum.toFixed(2)} គីឡូ` },
        { label: 'ស្ថានភាព', value: 'កំពុងរង់ចាំទទួល' },
      ]"
      status="partial"
      newLabel="ផ្ទេរថ្មី"
      @new="resetForm"
      @view="router.push('/stock')"
    />
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <PageHeader title="ផ្ទេរស្តុក" :onBack="() => step === 1 ? router.push('/dashboard') : step = 1" />
    <StepIndicator :step="step" :steps="['ព័ត៌មានផ្ទេរ', 'បញ្ជាក់']" />

    <div v-if="step === 1" class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ទីតាំង</SectionLabel>
        <div class="space-y-4">
          <div v-if="canChooseFrom">
            <SearchDropdown
              :options="branches.map(b => ({ id: b.id, label: b.name }))"
              :value="fromBranch"
              placeholder="ជ្រើសរើសសាខា..."
              label="ផ្ទេរចេញពី"
              @change="(id, label) => fromBranch = id"
            />
          </div>
          <div v-if="!canChooseFrom" class="bg-[#e0f9fb] border border-[#99e6ef] rounded-xl px-4 py-3 flex items-center justify-between">
            <span class="text-sm text-[#0097a7] font-semibold">ផ្ទេរចេញពីសាខារបស់ខ្ញុំ</span>
            <span class="text-sm font-bold text-[#0f2a4a]">{{ fromBranchName }}</span>
          </div>

          <div class="flex items-center justify-center">
            <div class="flex items-center gap-2 bg-[#e0f9fb] px-4 py-2 rounded-full text-[#0097a7] font-semibold text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              ផ្ទេរទៅ
            </div>
          </div>

          <SearchDropdown
            :options="branches.filter(b => b.id !== fromBranch).map(b => ({ id: b.id, label: b.name }))"
            :value="toBranch"
            placeholder="ជ្រើសសាខាទទួល..."
            label="ផ្ទេរទៅ"
            @change="(id, label) => { toBranch = id; toBranchName = label }"
          />

          <div v-if="fromBranch === toBranch && toBranch !== ''" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 text-[#b91c1c] text-sm font-medium">
            ⛔ មិនអាចផ្ទេរទៅសាខាដូចគ្នា
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>ផលិតផល</SectionLabel>
        <SearchDropdown
          :options="productOptions"
          :value="productId"
          placeholder="ជ្រើសរើសផលិតផល..."
          label="ផលិតផល"
          @change="(id, label) => { productId = id; productName = label }"
        />
        <div v-if="currentStock" class="mt-3">
          <StockInfoCard :branch="fromBranchName" :heads="currentStock.heads" :kg="currentStock.kg" :warning="currentStock.heads < 100" />
        </div>
      </Card>

      <Card>
        <SectionLabel>ចំនួនផ្ទេរ</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃផ្ទេរ</label>
            <input type="date" v-model="date" class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base" />
          </div>
          <FormField label="ចំនួនក្បាល" v-model:value="transferHeads" placeholder="0" :hint="currentStock ? `អតិបរមា: ${currentStock.heads} ក្បាល` : undefined" @numpadOpen="openNumpad('heads', transferHeads, 'ចំនួនក្បាល')" />
          <div v-if="overHead" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 text-[#b91c1c] text-sm font-medium">
            ⛔ លើសស្តុក! ស្តុកមានតែ {{ currentStock?.heads }} ក្បាល
          </div>
          <FormField label="ចំនួនគីឡូ" v-model:value="transferKg" placeholder="0.0" :hint="currentStock ? `អតិបរមា: ${currentStock.kg} គីឡូ` : undefined" @numpadOpen="openNumpad('kg', transferKg, 'ចំនួនគីឡូ')" />
          <div v-if="overKg" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 text-[#b91c1c] text-sm font-medium">
            ⛔ លើសស្តុក! ស្តុកមានតែ {{ currentStock?.kg }} គីឡូ
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
            <textarea v-model="note" rows="2" placeholder="..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
          </div>
        </div>
      </Card>
    </div>

    <div v-if="step === 2" class="space-y-5 pb-28">
      <div class="bg-[#0f2a4a] rounded-2xl p-5 text-white">
        <h2 class="font-bold text-base mb-4 text-[#00b4c8]">បញ្ជាក់ការផ្ទេរ</h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-white/10">
            <span class="text-white/60 text-sm">លេខផ្ទេរ</span>
            <span class="font-mono font-bold text-[#00b4c8]">{{ transferNo }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-white/10">
            <span class="text-white/60 text-sm">ផ្ទេរចេញ</span>
            <span class="font-semibold">{{ fromBranchName }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-white/10">
            <span class="text-white/60 text-sm">ផ្ទេរទៅ</span>
            <span class="font-semibold">{{ toBranchName }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-white/10">
            <span class="text-white/60 text-sm">ផលិតផល</span>
            <span class="font-semibold">{{ productName }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-white/10">
            <span class="text-white/60 text-sm">ក្បាល</span>
            <span class="font-bold text-xl">{{ headsNum.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-white/60 text-sm">គីឡូ</span>
            <span class="font-bold text-xl">{{ kgNum.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <Card v-if="currentStock">
        <SectionLabel>ស្តុកបន្ទាប់ពីផ្ទេរ · {{ fromBranchName }}</SectionLabel>
        <div class="grid grid-cols-2 gap-3">
          <CalcRow label="ក្បាលនៅសល់" :value="(currentStock.heads - headsNum).toLocaleString()" />
          <CalcRow label="គីឡូនៅសល់" :value="(currentStock.kg - kgNum).toFixed(1)" />
        </div>
      </Card>

      <div class="bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-4 py-4">
        <p class="text-sm text-[#92400e] font-medium text-center">
          ⚠️ បន្ទាប់ពីបញ្ជាក់ ការផ្ទេរនឹងត្រូវរង់ចាំការទទួលពី {{ toBranchName }}
        </p>
      </div>
    </div>

    <StickyActionBar
      :total="`${headsNum} ក្បាល`"
      totalLabel="ផ្ទេរ"
      :saveLabel="step === 1 ? 'ពិនិត្យ' : 'បញ្ជាក់ការផ្ទេរ'"
      :disabled="hasError || !productId || !toBranch"
      :onBack="step === 2 ? () => step = 1 : undefined"
      @save="step === 1 ? step = 2 : submitTransfer()"
    />

    <NumpadModal :isOpen="numpadOpen" :value="numpadValue" :label="numpadLabel" @update:value="numpadValue = $event" @close="closeNumpad" />
  </div>
</template>
