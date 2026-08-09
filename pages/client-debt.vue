<script setup lang="ts">
import type { Client, Invoice } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()
const expanded = ref<string | null>(null)

const clients = ref<Client[]>([])
const invoicesMap = reactive<Record<string, Invoice[]>>({})

const totalDebt = computed(() => clients.value.reduce((a, c) => a + c.debt, 0))
const debtors = computed(() => clients.value.filter((c) => c.debt > 0))

onMounted(async () => {
  try {
    clients.value = await api.get<Client[]>("/clients")
  } catch (e) {
    console.error(e)
  }
})

async function toggleExpand(id: string) {
  expanded.value = expanded.value === id ? null : id
  if (expanded.value && !invoicesMap[id]) {
    try {
      const res = await api.get<{ invoices: Invoice[] }>(`/clients/${id}`)
      invoicesMap[id] = res.invoices ?? []
    } catch (e) {
      console.error(e)
    }
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="លុយម៉ូយជំពាក់" :onBack="() => router.push('/dashboard')" />

    <!-- Summary -->
    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="bg-gradient-to-br from-[#b91c1c] to-[#dc2626] rounded-2xl p-4 text-white">
        <div class="text-2xl font-bold">${{ totalDebt.toLocaleString() }}</div>
        <div class="text-xs text-white/70 mt-1">ជំពាក់សរុប</div>
      </div>
      <div class="bg-gradient-to-br from-[#c2410c] to-[#ea580c] rounded-2xl p-4 text-white">
        <div class="text-2xl font-bold">{{ debtors.length }}</div>
        <div class="text-xs text-white/70 mt-1">អតិថិជន</div>
      </div>
    </div>

    <!-- Quick pay button -->
    <button
      @click="router.push('/client-payment')"
      class="w-full flex items-center justify-center gap-2 py-4 mb-5 rounded-2xl bg-[#00b4c8] text-white font-bold hover:bg-[#0097a7] transition-colors shadow-lg"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-5 h-5">
        <path d="M12 5v14M5 12h14" />
      </svg>
      ទទួលលុយម៉ូយ
    </button>

    <!-- Client list -->
    <div class="space-y-3">
      <Card v-for="client in clients" :key="client.id" :class="{ 'border-l-4 border-l-[#dc2626]': client.debt > 0 }">
        <button
          type="button"
          class="w-full text-left"
          @click="toggleExpand(client.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="font-bold text-gray-800">{{ client.name }}</span>
                <StatusBadge :status="client.debt === 0 ? 'paid' : 'credit'" />
              </div>
              <div class="text-xs text-gray-400">{{ client.phone }}</div>
              <div v-if="client.debt > 0" class="text-xs text-gray-500 mt-1">
                {{ client.invoices }} វិក្កយបត្រ · ចុងក្រោយ {{ client.lastPayment }}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="text-xl font-bold" :class="client.debt > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'">
                {{ client.debt > 0 ? `$${client.debt.toLocaleString()}` : "ទូទាត់" }}
              </div>
              <div v-if="client.debt > 0" class="text-xs text-gray-400">ជំពាក់</div>
              <div class="text-xs mt-1 transition-transform text-gray-400" :class="{ 'rotate-180': expanded === client.id }">
                ▼
              </div>
            </div>
          </div>
        </button>

        <div v-if="expanded === client.id && (invoicesMap[client.id] ?? []).length > 0" class="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <SectionLabel>វិក្កយបត្រ</SectionLabel>
          <div v-for="inv in (invoicesMap[client.id] ?? [])" :key="inv.id"
            class="flex items-center justify-between p-3 rounded-xl"
            :class="inv.status === 'credit' ? 'bg-[#fef2f2]' : inv.status === 'partial' ? 'bg-[#fff7ed]' : 'bg-[#dcfce7]'"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-gray-700">{{ inv.invoiceNo }}</span>
                <StatusBadge :status="inv.status" />
              </div>
              <div class="text-xs text-gray-500 mt-0.5">{{ inv.product }} · {{ inv.date }}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-sm" :class="inv.remaining > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'">
                {{ inv.remaining > 0 ? `ជំពាក់ $${inv.remaining}` : "បង់រួច" }}
              </div>
              <div class="text-xs text-gray-400">សរុប ${{ inv.total }}</div>
            </div>
          </div>

          <button
            v-if="client.debt > 0"
            @click="router.push(`/client-payment?client=${client.id}`)"
            class="w-full mt-2 py-3 rounded-xl bg-[#00b4c8] text-white font-bold text-sm hover:bg-[#0097a7] transition-colors"
          >
            ទទួលប្រាក់ពី {{ client.name }}
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>
