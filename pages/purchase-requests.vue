<script setup lang="ts">
import type { PurchaseRequest } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()
const prStore = usePurchaseRequestsStore()
const { role, user } = useAuth()

const canApprove = (r: PurchaseRequest) =>
  role.value === "admin" || (!!user.value?.branchId && user.value.branchId === r.sourceBranchId)

const requests = ref<PurchaseRequest[]>([])
const busyId = ref("")

const pending = computed(() => requests.value.filter((r) => r.status === "pending"))
const history = computed(() =>
  requests.value.filter(
    (r) =>
      r.status !== "pending" &&
      (role.value === "admin" || r.branchId === user.value?.branchId),
  ),
)

onMounted(load)

async function load() {
  try {
    requests.value = await api.get<PurchaseRequest[]>("/purchase-requests")
  } catch (e) {
    console.error(e)
  }
}

async function approve(r: PurchaseRequest) {
  busyId.value = r.id
  try {
    await api.post(`/purchase-requests/${r.id}/approve`, {})
    await prStore.refresh()
    router.push(
      `/stock-transfer?from=${r.sourceBranchId}&to=${r.branchId}&product=${r.productId}&heads=${r.heads}&kg=${r.kg}`,
    )
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចទទួលយកសំណើបាន")
  } finally {
    busyId.value = ""
  }
}

async function reject(r: PurchaseRequest) {
  busyId.value = r.id
  try {
    await api.post(`/purchase-requests/${r.id}/reject`, {})
    await prStore.refresh()
    await load()
  } catch (err: any) {
    alert(err?.data?.message || "មិនអាចបដិសេធសំណើបាន")
  } finally {
    busyId.value = ""
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <PageHeader title="ស្នើសុំស្តុកពីសាខា" :onBack="() => router.push('/dashboard')" />

    <div v-if="pending.length === 0" class="mb-5">
      <Card>
        <div class="text-center py-8">
          <div class="text-4xl mb-3">✅</div>
          <p class="font-bold text-[#16a34a]">គ្មានសំណើកំពុងរង់ចាំ</p>
          <p class="text-sm text-gray-400 mt-1">សំណើថ្មីពីសាខានឹងបង្ហាញនៅទីនេះ</p>
        </div>
      </Card>
    </div>

    <div class="space-y-3 mb-6">
      <Card v-for="r in pending" :key="r.id" class="border-l-4 border-l-[#f59e0b]">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs font-bold text-gray-700">{{ r.requestNo }}</span>
              <StatusBadge status="pending" />
            </div>
            <div class="text-xs text-gray-400 mt-0.5">{{ r.date }} · ដោយ {{ r.createdByName }}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="font-bold text-gray-800">{{ r.productName }}</div>
            <div class="text-xs text-gray-400">{{ r.heads }} ក្បាល · {{ r.kg }} គីឡូ</div>
          </div>
        </div>
        <div class="bg-[#e0f9fb] rounded-xl px-3 py-2 text-xs text-[#0097a7] font-semibold mb-3">
          {{ r.sourceBranchName }} → {{ r.branchName }}
        </div>
        <p v-if="r.note" class="text-xs text-gray-500 mb-3">{{ r.note }}</p>
        <div v-if="canApprove(r)" class="grid grid-cols-2 gap-2">
          <button
            @click="approve(r)"
            :disabled="busyId === r.id"
            class="py-3 rounded-xl bg-[#16a34a] text-white font-bold text-sm hover:bg-[#15803d] transition-colors disabled:opacity-60"
          >
            {{ busyId === r.id ? "កំពុង..." : "ទទួលយក" }}
          </button>
          <button
            @click="reject(r)"
            :disabled="busyId === r.id"
            class="py-3 rounded-xl bg-[#fef2f2] text-[#dc2626] font-bold text-sm border-2 border-[#fca5a5] hover:bg-[#fee2e2] transition-colors disabled:opacity-60"
          >
            បដិសេធ
          </button>
        </div>
        <div v-else class="text-xs text-gray-400 font-medium text-center">
          រង់ចាំសាខា {{ r.sourceBranchName }} អនុម័ត
        </div>
      </Card>
    </div>

    <div v-if="history.length > 0">
      <SectionLabel>ប្រវត្តិ</SectionLabel>
      <div class="space-y-2">
        <div v-for="r in history" :key="r.id" class="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs font-bold text-gray-700">{{ r.requestNo }}</span>
              <StatusBadge :status="r.status" />
            </div>
            <div class="text-xs text-gray-400 mt-0.5">{{ r.productName }} · {{ r.branchName }} · {{ r.heads }} ក្បាល</div>
          </div>
          <div class="text-right text-xs text-gray-400 flex-shrink-0">
            {{ r.decidedBy ?? r.createdByName }}
            <div>{{ r.decidedAt ?? r.date }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
