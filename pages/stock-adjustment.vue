<script setup lang="ts">
import type { Branch, Product } from "~/utils/data"

definePageMeta({ middleware: ["auth", "admin"] })

const router = useRouter()
const api = useApi()

const showToast = ref(false)
const saving = ref(false)

const products = ref<Product[]>([])
const branches = ref<Branch[]>([])

const productId = ref("")
const productName = ref("")
const branchId = ref("")
const branchName = ref("")
const adjustmentType = ref("")

const headsSign = ref<1 | -1>(1)
const headsAdjustment = ref("")
const kgSign = ref<1 | -1>(1)
const kgAdjustment = ref("")

const reason = ref("")
const date = ref(new Date().toISOString().slice(0, 10))

const numpadOpen = ref(false)
const numpadTarget = ref("")
const numpadValue = ref("")
const numpadLabel = ref("")

onMounted(async () => {
  try {
    const [p, b] = await Promise.all([
      api.get<Product[]>("/products"),
      api.get<Branch[]>("/branches"),
    ])
    products.value = p
    branches.value = b
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
  if (numpadTarget.value === "heads") headsAdjustment.value = numpadValue.value
  else if (numpadTarget.value === "kg") kgAdjustment.value = numpadValue.value
  numpadOpen.value = false
}

const selectedProduct = computed(() => products.value.find((p) => p.id === productId.value))
const currentStock = computed(() => selectedProduct.value?.stock?.[branchId.value])

const headsAdjNum = computed(() => parseFloat(headsAdjustment.value) || 0)
const kgAdjNum = computed(() => parseFloat(kgAdjustment.value) || 0)

const headsDelta = computed(() => headsSign.value * headsAdjNum.value)
const kgDelta = computed(() => kgSign.value * kgAdjNum.value)

const headsBefore = computed(() => currentStock.value?.heads ?? 0)
const kgBefore = computed(() => currentStock.value?.kg ?? 0)

const headsAfter = computed(() => headsBefore.value + headsDelta.value)
const kgAfter = computed(() => kgBefore.value + kgDelta.value)

const hasError = computed(() =>
  headsAfter.value < 0 || kgAfter.value < 0 || !productId.value || !branchId.value || !adjustmentType.value,
)

const adjustmentTypes = [
  { id: "dead", label: "មាន់ងាប់" },
  { id: "lost", label: "បាត់បង់" },
  { id: "weight_diff", label: "ទម្ងន់ខុសគ្នា" },
  { id: "restock", label: "រាប់ស្តុកឡើងវិញ" },
  { id: "other", label: "ផ្សេងៗ" },
]

const productOptions = computed(() =>
  products.value.map((p) => ({ id: p.id, label: p.name })),
)

const branchOptions = computed(() =>
  branches.value.map((b) => ({ id: b.id, label: b.name })),
)

function toggleHeadsSign() {
  headsSign.value = headsSign.value === 1 ? -1 : 1
}

function toggleKgSign() {
  kgSign.value = kgSign.value === 1 ? -1 : 1
}

async function handleSave() {
  if (hasError.value || saving.value) return
  saving.value = true
  try {
    await api.post("/adjustments", {
      date: date.value,
      product: productId.value,
      branch: branchId.value,
      type: adjustmentType.value,
      headsAdjustment: headsDelta.value,
      kgAdjustment: kgDelta.value,
      reason: reason.value,
    })
    showToast.value = true
    setTimeout(() => {
      router.push("/stock")
    }, 2000)
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចរក្សាទុកការកែសម្រួលបាន")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <PageHeader title="កែសម្រួលស្តុក" :onBack="() => router.push('/stock')" />

    <div class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ជ្រើសរើសផលិតផល និង សាខា</SectionLabel>
        <div class="space-y-4">
          <SearchDropdown
            :options="productOptions"
            :value="productId"
            placeholder="ជ្រើសរើសផលិតផល..."
            label="ផលិតផល"
            @change="(id, label) => { productId = id; productName = label }"
          />
          <SearchDropdown
            :options="branchOptions"
            :value="branchId"
            placeholder="ជ្រើសរើសសាខា..."
            label="សាខា"
            @change="(id, label) => { branchId = id; branchName = label }"
          />
        </div>
        <div v-if="currentStock" class="mt-4">
          <StockInfoCard
            :branch="branchName"
            :heads="currentStock.heads"
            :kg="currentStock.kg"
            :warning="currentStock.heads < 100"
          />
        </div>
      </Card>

      <Card v-if="currentStock">
        <SectionLabel>ប្រភេទការកែសម្រួល</SectionLabel>
        <SearchDropdown
          :options="adjustmentTypes"
          :value="adjustmentType"
          placeholder="ជ្រើសរើសប្រភេទ..."
          label="ប្រភេទការកែសម្រួល"
          @change="(id) => { adjustmentType = id }"
        />
      </Card>

      <Card v-if="currentStock">
        <SectionLabel>កែសម្រួលចំនួនក្បាល</SectionLabel>
        <div class="space-y-4">
          <FormField label="ក្បាលមុនកែ" :value="headsBefore.toLocaleString()" readOnly />
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">បញ្ចូលកែសម្រួលក្បាល</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="toggleHeadsSign"
                class="w-12 h-[52px] rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-colors flex-shrink-0"
                :class="headsSign === 1 ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'"
              >
                {{ headsSign === 1 ? '+' : '−' }}
              </button>
              <div class="flex-1">
                <FormField label="" v-model:value="headsAdjustment" placeholder="0" @numpadOpen="openNumpad('heads', headsAdjustment, 'កែសម្រួលក្បាល')" />
              </div>
            </div>
          </div>
          <CalcRow label="ក្បាលក្រោយកែ" :value="headsAfter.toLocaleString()" highlight />
          <div v-if="headsAfter < 0 && headsAdjNum > 0" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 text-[#b91c1c] text-sm font-medium">
            ⛔ ក្បាលក្រោយកែមិនអាចអវិជ្ជមាន
          </div>
        </div>
      </Card>

      <Card v-if="currentStock">
        <SectionLabel>កែសម្រួលគីឡូ</SectionLabel>
        <div class="space-y-4">
          <FormField label="គីឡូមុនកែ" :value="kgBefore.toLocaleString()" readOnly />
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">បញ្ចូលកែសម្រួលគីឡូ</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="toggleKgSign"
                class="w-12 h-[52px] rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-colors flex-shrink-0"
                :class="kgSign === 1 ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'"
              >
                {{ kgSign === 1 ? '+' : '−' }}
              </button>
              <div class="flex-1">
                <FormField label="" v-model:value="kgAdjustment" placeholder="0.0" @numpadOpen="openNumpad('kg', kgAdjustment, 'កែសម្រួលគីឡូ')" />
              </div>
            </div>
          </div>
          <CalcRow label="គីឡូក្រោយកែ" :value="kgAfter.toFixed(1)" highlight />
          <div v-if="kgAfter < 0 && kgAdjNum > 0" class="bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3 text-[#b91c1c] text-sm font-medium">
            ⛔ គីឡូក្រោយកែមិនអាចអវិជ្ជមាន
          </div>
        </div>
      </Card>

      <Card v-if="currentStock">
        <SectionLabel>ព័ត៌មានបន្ថែម</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃកែសម្រួល</label>
            <input type="date" v-model="date" class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">មូលហេតុ</label>
            <textarea v-model="reason" rows="3" placeholder="ពន្យល់ពីមូលហេតុនៃការកែសម្រួល..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
          </div>
        </div>
      </Card>
    </div>

    <StickyActionBar
      :total="`${headsDelta >= 0 ? '+' : ''}${headsDelta.toLocaleString()} ក្បាល, ${kgDelta >= 0 ? '+' : ''}${kgDelta.toFixed(1)} គីឡូ`"
      totalLabel="ការកែសម្រួល"
      saveLabel="រក្សាទុកការកែសម្រួល"
      :disabled="hasError"
      @save="handleSave"
    />

    <NumpadModal :isOpen="numpadOpen" :value="numpadValue" :label="numpadLabel" @update:value="numpadValue = $event" @close="closeNumpad" />

    <Toast v-if="showToast" message="ការកែសម្រួលស្តុកបានរក្សាទុក!" type="success" @close="showToast = false" />
  </div>
</template>
