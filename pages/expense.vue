<script setup lang="ts">
import type { Branch } from "~/utils/data"
import { isTouchDevice } from "~/composables/useTouch"

definePageMeta({ middleware: ["auth", "admin"] })

const router = useRouter()
const api = useApi()
const { role, user } = useAuth()
const isTouch = isTouchDevice()

const branches = ref<Branch[]>([])
const expenseCategories = ref<string[]>([])

const date = ref(new Date().toISOString().slice(0, 10))
const category = ref("")
const description = ref("")
const amount = ref("")
const payMethod = ref<"cash" | "bank">("cash")
const branch = ref("")
const note = ref("")
const showToast = ref(false)
const saving = ref(false)

onMounted(async () => {
  try {
    const [b, s] = await Promise.all([
      api.get<Branch[]>("/branches"),
      api.get<any>("/settings"),
    ])
    branches.value = b
    expenseCategories.value = s.expenseCategories ?? []
    if (user.value?.branchId) branch.value = user.value.branchId
    else if (b.length) branch.value = b[0].id
  } catch (e) {
    console.error(e)
  }
})

const amountNum = computed(() => parseFloat(amount.value) || 0)

async function save() {
  if (!category.value || amountNum.value === 0 || saving.value) return
  saving.value = true
  try {
    await api.post("/expenses", {
      date: date.value,
      category: category.value,
      description: description.value,
      amount: amountNum.value,
      method: payMethod.value,
      branch: branch.value,
      note: note.value,
    })
    showToast.value = true
    setTimeout(() => router.push("/dashboard"), 1800)
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចរក្សាទុកចំណាយបាន")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <Toast v-if="showToast" message="ចំណាយបានរក្សាទុក!" type="success" @close="showToast = false" />

    <PageHeader title="ចំណាយថ្មី" :onBack="() => router.push('/dashboard')" />

    <div class="space-y-5 pb-28">
      <Card>
        <SectionLabel>ព័ត៌មានចំណាយ</SectionLabel>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ថ្ងៃចំណាយ</label>
            <input type="date" v-model="date" class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">
              ប្រភេទចំណាយ <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="cat in expenseCategories"
                :key="cat"
                type="button"
                @click="category = cat"
                class="py-3 px-3 rounded-xl border-2 text-sm font-medium text-left transition-all"
                :class="category === cat ? 'border-[#00b4c8] bg-[#e0f9fb] text-[#0f2a4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ព័ត៌មានចំណាយ</label>
            <input
              type="text"
              v-model="description"
              placeholder="ពណ៌នាអំពីចំណាយ..."
              class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base"
            />
          </div>

          <div v-if="role === 'admin'">
            <SearchDropdown
              :options="branches.map(b => ({ id: b.id, label: b.name }))"
              :value="branch"
              placeholder="ជ្រើសរើសសាខា..."
              label="សាខា"
              @change="(id, label) => branch = id"
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>ប្រាក់</SectionLabel>
        <div class="space-y-4">
          <PaymentMethodSelector :value="payMethod" @change="payMethod = $event" />

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              ចំនួនលុយ ($) <span class="text-red-500">*</span>
            </label>
            <div class="bg-[#0f2a4a] rounded-2xl px-4 py-3 mb-3">
              <input
                :value="amount"
                inputmode="decimal"
                :readonly="isTouch"
                @input="amount = ($event.target as HTMLInputElement).value"
                placeholder="0"
                class="w-full bg-transparent text-right text-4xl font-bold text-white min-h-[52px] outline-none placeholder:text-white/40"
              />
              <div class="text-right text-xs text-[#00b4c8] mt-1">USD</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="k in ['7','8','9','4','5','6','1','2','3','.','0','⌫']"
                :key="k"
                type="button"
                @pointerdown.prevent="
                  k === '⌫' ? amount = amount.slice(0, -1)
                  : k === '.' ? (!amount.includes('.') && (amount += '.'))
                  : amount = amount === '0' ? k : amount + k
                "
                class="h-14 rounded-xl text-xl font-bold transition-all active:scale-95"
                :class="k === '⌫' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-white text-[#0f2a4a] shadow-sm border border-gray-100 hover:bg-[#e0f9fb]'"
              >
                {{ k }}
              </button>
            </div>

            <div class="flex gap-2 mt-3 flex-wrap">
              <button
                v-for="v in ['5','10','20','50','100']"
                :key="v"
                type="button"
                @click="amount = v"
                class="flex-1 min-w-[3rem] py-2.5 rounded-xl bg-[#e8eef5] text-[#0f2a4a] font-semibold text-sm hover:bg-[#e0f9fb] transition-colors"
              >
                ${{ v }}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">កំណត់ចំណាំ</label>
        <textarea v-model="note" rows="2" placeholder="..." class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-sm resize-none" />
      </Card>
    </div>

    <StickyActionBar
      :total="amountNum > 0 ? `$${amountNum.toFixed(2)}` : '$0.00'"
      totalLabel="ចំណាយ"
      saveLabel="រក្សាទុកចំណាយ"
      :disabled="!category || amountNum === 0"
      @save="save"
    />
  </div>
</template>
