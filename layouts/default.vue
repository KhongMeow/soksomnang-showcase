<script setup lang="ts">
const { role, logout, user, has, fetchMe } = useAuth()
const route = useRoute()
const router = useRouter()
const api = useApi()
const sidebarOpen = ref(false)
const prStore = usePurchaseRequestsStore()

const canReviewRequests = computed(() => !!role.value)

const branches = ref<{ id: string; name: string }[]>([])

const currentBranchName = computed(() => {
  if (!user.value) return ""
  if (!user.value.branchId) return "គ្រប់សាខា"
  return branches.value.find((b) => b.id === user.value?.branchId)?.name ?? ""
})

onMounted(async () => {
  try {
    if (!user.value) {
      await fetchMe()
    }
    branches.value = await api.get<{ id: string; name: string }[]>("/branches")
  } catch (e) {
    console.error(e)
  }
  if (canReviewRequests.value) {
    prStore.refresh()
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => {
      if (canReviewRequests.value) prStore.refresh()
    }, 15000)
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

let pollTimer: ReturnType<typeof setInterval> | null = null

watch(() => route.path, () => {
  sidebarOpen.value = false
  if (canReviewRequests.value) prStore.refresh()
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0)
  }
})

type NavItem = {
  id: string
  path: string
  label: string
  icon: ReturnType<typeof resolveComponent>
  perm?: string
}

const NAV_ITEMS_ADMIN: NavItem[] = [
  { id: "dashboard", path: "/dashboard", label: "ផ្ទាំងគ្រប់គ្រង", icon: resolveComponent("IconHome") },
  { id: "new-purchase", path: "/new-purchase", label: "ទិញចូល", icon: resolveComponent("IconPurchase") },
  { id: "purchase-requests", path: "/purchase-requests", label: "ស្នើសុំស្តុក", icon: resolveComponent("IconPurchase") },
  { id: "stock", path: "/stock", label: "ស្តុក", icon: resolveComponent("IconStock") },
  { id: "stock-transfer", path: "/stock-transfer", label: "ផ្ទេរស្តុក", icon: resolveComponent("IconTransfer") },
  { id: "new-sale", path: "/new-sale", label: "លក់", icon: resolveComponent("IconSale") },
  { id: "client-debt", path: "/client-debt", label: "ជំពាក់ Client", icon: resolveComponent("IconDebt") },
  { id: "supplier-payment", path: "/supplier-payment", label: "ទូទាត់ Supplier", icon: resolveComponent("IconSupplier") },
  { id: "expense", path: "/expense", label: "ចំណាយ", icon: resolveComponent("IconExpense") },
  { id: "reports", path: "/reports", label: "របាយការណ៍", icon: resolveComponent("IconReport") },
  { id: "settings", path: "/settings", label: "ការកំណត់", icon: resolveComponent("IconSettings") },
]

const NAV_ITEMS_STAFF: NavItem[] = [
  { id: "dashboard", path: "/dashboard", label: "ទំព័រដើម", icon: resolveComponent("IconHome") },
  { id: "new-sale", path: "/new-sale", label: "លក់", icon: resolveComponent("IconSale"), perm: "create_sale" },
  { id: "sales", path: "/sales", label: "ប្រវត្តិលក់", icon: resolveComponent("IconReport") },
  { id: "new-purchase", path: "/new-purchase", label: "ស្នើសុំស្តុក", icon: resolveComponent("IconPurchase") },
  { id: "purchase-requests", path: "/purchase-requests", label: "អនុម័តស្តុក", icon: resolveComponent("IconPurchase") },
  { id: "my-requests", path: "/my-requests", label: "សំណើរបស់ខ្ញុំ", icon: resolveComponent("IconStock") },
  { id: "stock", path: "/stock", label: "ស្តុក", icon: resolveComponent("IconStock") },
  { id: "stock-transfer", path: "/stock-transfer", label: "ផ្ទេរស្តុក", icon: resolveComponent("IconTransfer") },
  { id: "client-debt", path: "/client-debt", label: "ម៉ូយជំពាក់", icon: resolveComponent("IconDebt") },
]

const BOTTOM_NAV_ADMIN: NavItem[] = [
  { id: "dashboard", path: "/dashboard", label: "ផ្ទាំង", icon: resolveComponent("IconHome") },
  { id: "new-purchase", path: "/new-purchase", label: "ទិញ", icon: resolveComponent("IconPurchase") },
  { id: "new-sale", path: "/new-sale", label: "លក់", icon: resolveComponent("IconSale") },
  { id: "stock", path: "/stock", label: "ស្តុក", icon: resolveComponent("IconStock") },
  { id: "reports", path: "/reports", label: "របាយ", icon: resolveComponent("IconReport") },
]

const BOTTOM_NAV_STAFF: NavItem[] = [
  { id: "dashboard", path: "/dashboard", label: "ផ្ទាំង", icon: resolveComponent("IconHome") },
  { id: "new-sale", path: "/new-sale", label: "លក់", icon: resolveComponent("IconSale"), perm: "create_sale" },
  { id: "stock", path: "/stock", label: "ស្តុក", icon: resolveComponent("IconStock") },
  { id: "client-debt", path: "/client-debt", label: "ជំពាក់", icon: resolveComponent("IconDebt") },
  { id: "client-payment", path: "/client-payment", label: "ទទួល", icon: resolveComponent("IconDebt"), perm: "receive_payment" },
]

const navItems = computed(() =>
  role.value === "admin"
    ? NAV_ITEMS_ADMIN
    : NAV_ITEMS_STAFF.filter((i) => !i.perm || has(i.perm)),
)

const bottomNav = computed(() => {
  const items = role.value === "admin" ? BOTTOM_NAV_ADMIN : BOTTOM_NAV_STAFF
  return items.filter((i) => !i.perm || has(i.perm))
})

const isActive = (path: string) => route.path === path

function navigate(path: string) {
  sidebarOpen.value = false
  if (route.path !== path) {
    router.push(path)
  }
}

const isLoginPage = computed(() => route.path === "/login" || route.path === "/showcase")

watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div v-if="isLoginPage">
    <slot />
  </div>
  <div v-else class="min-h-screen bg-[#f0f4f8]">
    <!-- Desktop sidebar -->
    <aside class="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#0f2a4a] z-40">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div class="w-10 h-10 rounded-xl bg-[#00b4c8] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" class="w-6 h-6">
            <circle cx="16" cy="11" r="7" fill="white" opacity="0.9" />
            <path d="M4 26c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7" />
          </svg>
        </div>
        <div>
          <div class="text-white font-bold text-base leading-tight">Soksomnang</div>
          <div class="text-[#00b4c8] text-xs">ប្រព័ន្ធគ្រប់គ្រង</div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="navigate(item.path)"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 active:scale-[0.98]"
          :class="
            isActive(item.path)
              ? 'bg-[#00b4c8] text-white shadow-md shadow-[#00b4c8]/20'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          "
        >
          <span class="flex-shrink-0 transition-transform duration-200" :class="{ 'scale-105': isActive(item.path) }">
            <component :is="item.icon" />
          </span>
          <span class="font-medium text-sm">{{ item.label }}</span>
          <span
            v-if="item.id === 'purchase-requests' && prStore.pending > 0"
            class="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#dc2626] text-white text-xs font-bold flex items-center justify-center shadow-sm"
          >
            {{ prStore.pending }}
          </span>
        </button>
      </nav>

      <div class="px-5 py-4 border-t border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#00b4c8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {{ role === "admin" ? "A" : "S" }}
          </div>
          <div>
            <div class="text-white font-semibold text-sm">{{ user?.name || (role === "admin" ? "Admin" : "Sale Staff") }}</div>
            <div class="text-white/40 text-xs">{{ currentBranchName }}</div>
          </div>
        </div>
        <button
          @click="logout(); router.push('/login')"
          class="mt-3 w-full py-2 rounded-xl bg-white/10 text-white/60 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          ចាកចេញ
        </button>
      </div>
    </aside>

    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="fixed inset-0 z-50 flex lg:hidden">
        <div class="absolute inset-0 bg-black/50" @click="sidebarOpen = false" />
        <aside class="relative flex flex-col w-72 bg-[#0f2a4a] h-full">
          <div class="flex items-center justify-between px-5 py-5 border-b border-white/10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#00b4c8] flex items-center justify-center">
                <svg viewBox="0 0 32 32" fill="none" class="w-6 h-6">
                  <circle cx="16" cy="11" r="7" fill="white" opacity="0.9" />
                  <path d="M4 26c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7" />
                </svg>
              </div>
              <div>
                <div class="text-white font-bold text-base">Soksomnang</div>
                <div class="text-[#00b4c8] text-xs">ប្រព័ន្ធគ្រប់គ្រង</div>
              </div>
            </div>
            <button @click="sidebarOpen = false" class="text-white/50 hover:text-white p-1">
              <IconClose />
            </button>
          </div>
          <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <button
              v-for="item in navItems"
              :key="item.id"
              @click="navigate(item.path)"
              class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
              :class="
                isActive(item.path)
                  ? 'bg-[#00b4c8] text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              "
            >
              <span><component :is="item.icon" /></span>
              <span class="font-medium">{{ item.label }}</span>
              <span
                v-if="item.id === 'purchase-requests' && prStore.pending > 0"
                class="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#dc2626] text-white text-xs font-bold flex items-center justify-center"
              >
                {{ prStore.pending }}
              </span>
            </button>
          </nav>
          <div class="px-5 py-4 border-t border-white/10">
            <button
              @click="logout(); router.push('/login')"
              class="w-full py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              ចាកចេញ
            </button>
          </div>
        </aside>
      </div>
    </Transition>

    <!-- Main content area -->
    <div class="lg:ml-64">
      <!-- Mobile top bar -->
      <div class="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          @click="sidebarOpen = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f0f4f8] text-[#0f2a4a]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#00b4c8] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4">
              <circle cx="12" cy="8" r="5" fill="white" opacity="0.9" />
              <path d="M2 20c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7" />
            </svg>
          </div>
          <span class="font-bold text-[#0f2a4a] text-sm">Soksomnang</span>
        </div>
        <div class="w-10 h-10 rounded-xl bg-[#0f2a4a] flex items-center justify-center text-white font-bold text-sm">
          {{ role === "admin" ? "A" : "S" }}
        </div>
      </div>

      <!-- Page content -->
      <main class="px-4 py-5 lg:px-8 lg:py-6 pb-24 lg:pb-8 min-h-screen">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom navigation -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-30 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div class="grid grid-cols-5 items-stretch">
        <button
          v-for="item in bottomNav"
          :key="item.id"
          @click="navigate(item.path)"
          class="relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0 transition-all duration-200 active:scale-95 select-none"
          :class="isActive(item.path) ? 'text-[#00b4c8]' : 'text-gray-400 active:text-gray-600'"
        >
          <span class="transition-transform duration-200" :class="{ 'scale-110 -translate-y-0.5': isActive(item.path) }">
            <component :is="item.icon" />
          </span>
          <span class="text-[11px] font-semibold leading-tight text-center whitespace-nowrap w-full px-0.5 transition-colors duration-200" :class="{ 'text-[#0f2a4a] font-bold': isActive(item.path) }">
            {{ item.label }}
          </span>
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full transition-all duration-300"
            :class="isActive(item.path) ? 'bg-[#00b4c8] opacity-100 scale-x-100 shadow-sm shadow-[#00b4c8]/50' : 'opacity-0 scale-x-0'"
          />
        </button>
      </div>
    </nav>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
