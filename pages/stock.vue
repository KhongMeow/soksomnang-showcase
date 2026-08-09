<script setup lang="ts">
import type { Branch, Product } from "~/utils/data"

definePageMeta({ middleware: "auth" })

const router = useRouter()
const api = useApi()
const { role, user } = useAuth()
const activeBranch = ref("")

const branches = ref<Branch[]>([])
const products = ref<Product[]>([])

onMounted(async () => {
  try {
    const [b, p] = await Promise.all([
      api.get<Branch[]>("/branches"),
      api.get<Product[]>("/products"),
    ])
    branches.value = b
    products.value = p
    if (user.value?.branchId) activeBranch.value = user.value.branchId
    else if (b.length) activeBranch.value = b[0].id
  } catch (e) {
    console.error(e)
  }
})

const branchData = computed(() =>
  products.value.map((p) => ({
    ...p,
    heads: p.stock?.[activeBranch.value]?.heads ?? 0,
    kg: p.stock?.[activeBranch.value]?.kg ?? 0,
  })),
)

const totalHeads = computed(() => branchData.value.reduce((a, p) => a + p.heads, 0))
const totalKg = computed(() => branchData.value.reduce((a, p) => a + p.kg, 0))
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="ស្តុក" :onBack="() => router.push('/dashboard')" />

    <!-- Branch tabs (admin) / current branch (staff) -->
    <div v-if="role === 'admin'" class="flex gap-2 overflow-x-auto pb-2 mb-5">
      <button
        v-for="b in branches"
        :key="b.id"
        @click="activeBranch = b.id"
        class="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        :class="activeBranch === b.id ? 'bg-[#0f2a4a] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'"
      >
        {{ b.name }}
      </button>
    </div>
    <div v-else class="mb-5 px-4 py-2.5 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold inline-block">
      {{ branches.find(b => b.id === activeBranch)?.name }}
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <Card class="text-center p-3">
        <div class="text-xl font-bold text-[#0f2a4a]">{{ products.length }}</div>
        <div class="text-xs text-gray-500 mt-1">ប្រភេទ</div>
      </Card>
      <Card class="text-center p-3">
        <div class="text-xl font-bold text-[#0f2a4a]">{{ totalHeads.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">ក្បាល</div>
      </Card>
      <Card class="text-center p-3">
        <div class="text-xl font-bold text-[#0f2a4a]">{{ totalKg.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 mt-1">គីឡូ</div>
      </Card>
    </div>

    <!-- Stock cards -->
    <div class="space-y-3">
      <Card v-for="p in branchData" :key="p.id" :class="{ 'border-[#fed7aa] border-2': p.heads < 150 }">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h3 class="font-bold text-gray-800">{{ p.name }}</h3>
              <span v-if="p.heads < 150" class="text-xs font-bold text-[#ea580c] bg-[#fff7ed] px-2 py-0.5 rounded-full">
                ⚠ ស្ទើរអស់
              </span>
            </div>
            <div class="text-xs text-gray-400 mb-3">{{ branches.find(b => b.id === activeBranch)?.name }}</div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-[#e8eef5] rounded-xl p-3 text-center">
                <div class="text-xl font-bold text-[#0f2a4a]">{{ p.heads.toLocaleString() }}</div>
                <div class="text-xs text-gray-500 mt-0.5">ក្បាល</div>
              </div>
              <div class="bg-[#e8eef5] rounded-xl p-3 text-center">
                <div class="text-xl font-bold text-[#0f2a4a]">{{ p.kg.toLocaleString() }}</div>
                <div class="text-xs text-gray-500 mt-0.5">គីឡូ</div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button
            @click="router.push('/stock-transfer')"
            class="flex-1 py-2.5 rounded-xl bg-[#e0f9fb] text-[#0097a7] font-semibold text-sm hover:bg-[#a5f3fc] transition-colors"
          >
            ផ្ទេរ
          </button>
          <button class="flex-1 py-2.5 rounded-xl bg-[#e8eef5] text-[#0f2a4a] font-semibold text-sm hover:bg-[#c5d4e8] transition-colors">
            ប្រវត្តិ
          </button>
        </div>
      </Card>
    </div>

    <!-- Transfer shortcut -->
    <div class="mt-5 space-y-3">
      <button
        @click="router.push('/stock-transfer')"
        class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0f2a4a] text-white font-bold hover:bg-[#1a4a7a] transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3M7 12h10M12 7l5 5-5 5" />
        </svg>
        ផ្ទេរស្តុក
      </button>
      <button
        @click="router.push('/stock-adjustment')"
        class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#fff7ed] border-2 border-[#fed7aa] text-[#c2410c] font-bold hover:bg-[#fed7aa] transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        កែសម្រួលស្តុក
      </button>
    </div>
  </div>
</template>
