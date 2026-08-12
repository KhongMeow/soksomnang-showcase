<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isLoggedIn, role, user } = useAuth()
const api = useApi()

type DisplayMode = "side" | "desktop" | "mobile" | "comments"
type Category = "all" | "auth" | "sales" | "stock" | "purchasing" | "finance"

const displayMode = ref<DisplayMode>("side")
const selectedCategory = ref<Category>("all")
const activeScreenId = ref<string>("admin-dashboard")
const isLoadingAuth = ref(false)
const iframeKey = ref(0)
const showCommentsSection = ref(true)
const showMobileControlsDrawer = ref(false)
const showCommentsModal = ref(false)
const commentCounts = ref<Record<string, number>>({})

function selectScreenById(id: string) {
  const s = screens.find((sc) => sc.id === id)
  if (s) selectScreen(s)
}

const desktopIframeRef = ref<HTMLIFrameElement | null>(null)
const mobileIframeRef = ref<HTMLIFrameElement | null>(null)
const currentIframeRoute = ref<string>("/dashboard")

let routeTrackerTimer: ReturnType<typeof setInterval> | null = null

const screens = [
  {
    id: "admin-dashboard",
    title: "ផ្ទាំងគ្រប់គ្រង (Dashboard)",
    category: "auth",
    route: "/dashboard",
    description: "សង្ខេបចំណូល ចំណាយ ជំពាក់ ស្តុកសរុប និងប្រតិបត្តិការរហ័ស",
    badge: "Admin & Staff",
  },
  {
    id: "new-sale",
    title: "ទំព័រលក់ / POS (New Sale)",
    category: "sales",
    route: "/new-sale",
    description: "ប្រព័ន្ធចេញវិក្កយបត្រលក់ ជ្រើសរើសម៉ូយ គណនាតម្លៃ និងបង់ប្រាក់",
    badge: "Core POS",
  },
  {
    id: "sales-history",
    title: "ប្រវត្តិលក់ (Sales History)",
    category: "sales",
    route: "/sales",
    description: "បញ្ជីវិក្កយបត្រលក់ទាំងអស់ ស្វែងរក តាមដានស្ថានភាពបង់ប្រាក់",
    badge: "Sales",
  },
  {
    id: "client-debt",
    title: "ម៉ូយជំពាក់ (Client Debt)",
    category: "sales",
    route: "/client-debt",
    description: "គ្រប់គ្រងបញ្ជីអតិថិជនជំពាក់ប្រាក់ និងប្រវត្តិវិក្កយបត្រមិនទាន់ទូទាត់",
    badge: "Finance",
  },
  {
    id: "client-payment",
    title: "ទទួលប្រាក់ពីម៉ូយ (Client Payment)",
    category: "sales",
    route: "/client-payment",
    description: "ទម្រង់កាត់កងបំណុលម៉ូយ និងចេញលិខិតទទួលប្រាក់ (Receipt)",
    badge: "Finance",
  },
  {
    id: "stock-inventory",
    title: "បញ្ជីស្តុក (Stock Inventory)",
    category: "stock",
    route: "/stock",
    description: "ពិនិត្យស្តុកមាន់តាមប្រភេទ (ក្បាល/គីឡូ) តាមបណ្តាសាខានីមួយៗ",
    badge: "Stock",
  },
  {
    id: "stock-transfer",
    title: "ផ្ទេរស្តុក (Stock Transfer)",
    category: "stock",
    route: "/stock-transfer",
    description: "ផ្ទេរស្តុកទំនិញរវាងសាខា Central, អូរឫស្សី និងផ្សារដើមគរ",
    badge: "Stock",
  },
  {
    id: "stock-adjustment",
    title: "កែសម្រួលស្តុក (Stock Adjustment)",
    category: "stock",
    route: "/stock-adjustment",
    description: "កែតម្រូវចំនួនស្តុក (មាន់ងាប់ក្នុងការដឹក ឬបន្ថែមស្តុក)",
    badge: "Stock",
  },
  {
    id: "new-purchase",
    title: "ទិញចូល / ស្នើសុំ (New Purchase)",
    category: "purchasing",
    route: "/new-purchase",
    description: "បង្កើតប័ណ្ណទិញមាន់ចូលស្តុកពី Supplier ឬផ្ញើប័ណ្ណស្នើសុំ",
    badge: "Purchasing",
  },
  {
    id: "stock-requests",
    title: "អនុម័តសំណើស្តុក (Stock Requests)",
    category: "purchasing",
    route: "/purchase-requests",
    description: "ពិនិត្យ និងអនុម័តសំណើស្តុកពីសាខានានាដោយ Admin",
    badge: "Admin",
  },
  {
    id: "my-requests",
    title: "សំណើរបស់ខ្ញុំ (Staff Requests)",
    category: "purchasing",
    route: "/my-requests",
    description: "បញ្ជីសំណើស្តុកដែលបង្កើតដោយ Staff តាមដានស្ថានភាព Approval",
    badge: "Staff",
  },
  {
    id: "supplier-payment",
    title: "ទូទាត់ Supplier (Supplier Payment)",
    category: "purchasing",
    route: "/supplier-payment",
    description: "តាមដានបំណុលជំពាក់ Supplier និងកាត់កងប្រាក់ទូទាត់ទិញចូល",
    badge: "Finance",
  },
  {
    id: "expense-management",
    title: "គ្រប់គ្រងចំណាយ (Expenses)",
    category: "finance",
    route: "/expense",
    description: "កត់ត្រាចំណាយប្រចាំថ្ងៃ (ថ្លៃដឹក ម្ហូបអាហារ ប្រេងឥន្ធនៈ)",
    badge: "Finance",
  },
  {
    id: "reports-hub",
    title: "មជ្ឈមណ្ឌលរបាយការណ៍ (Reports)",
    category: "finance",
    route: "/reports",
    description: "មជ្ឈមណ្ឌលវិភាគទិន្នន័យ ការលក់ ចំណេញ/ខាត និងប្រតិបត្តិការ",
    badge: "Analytics",
  },
  {
    id: "sales-report",
    title: "របាយការណ៍លក់លម្អិត (Daily Sales)",
    category: "finance",
    route: "/reports/sale",
    description: "របាយការណ៍លក់លម្អិតតាមថ្ងៃ សាខា និងប្រភេទសាច់",
    badge: "Analytics",
  },
  {
    id: "settings",
    title: "ការកំណត់ប្រព័ន្ធ (Settings)",
    category: "finance",
    route: "/settings",
    description: "កំណត់តារាងតម្លៃ Matrix តាមសាខា ប្រភេទចំណាយ និងពាក្យសម្ងាត់",
    badge: "Settings",
  },
  {
    id: "login",
    title: "ទំព័រចូលប្រើប្រាស់ (Login)",
    category: "auth",
    route: "/login",
    description: "ទំព័រ Authentication សម្រាប់ Admin និង Staff ចូលប្រើប្រាស់ប្រព័ន្ធ",
    badge: "Public",
  },
]

const categories = [
  { id: "all", name: "ទាំងអស់ (All Screens)" },
  { id: "auth", name: "🔑 ចូលប្រើប្រាស់ & Dashboard" },
  { id: "sales", name: "🛒 លក់ & POS & ជំពាក់" },
  { id: "stock", name: "📦 ស្តុក & ផ្ទេរ & កែសម្រួល" },
  { id: "purchasing", name: "🤝 ទិញចូល & ស្នើសុំ" },
  { id: "finance", name: "📊 ចំណាយ & របាយការណ៍" },
]

const userProfiles = [
  { username: "admin", pass: "admin", label: "👑 Admin (គ្រប់សាខា)", color: "bg-[#00b4c8]" },
  { username: "staff", pass: "staff", label: "🏬 Central ស្ទឹងមានជ័យ", color: "bg-emerald-600" },
  { username: "staff1", pass: "staff", label: "🏬 អូរឫស្សី", color: "bg-cyan-600" },
  { username: "staff2", pass: "staff", label: "🏬 ផ្សារដើមគរ", color: "bg-teal-600" },
]

const filteredScreens = computed(() => {
  if (selectedCategory.value === "all") return screens
  return screens.filter((s) => s.category === selectedCategory.value)
})

const activeScreen = computed(() => {
  return screens.find((s) => s.id === activeScreenId.value) || screens[0]
})

onMounted(async () => {
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    displayMode.value = "mobile"
  }
  if (!isLoggedIn.value) {
    await switchToUser("admin", "admin")
  }
  fetchCommentCounts()
  routeTrackerTimer = setInterval(trackIframeRoute, 600)
})

onUnmounted(() => {
  if (routeTrackerTimer) clearInterval(routeTrackerTimer)
})

function isInvalidPath(p?: string) {
  if (!p) return true
  const lower = p.toLowerCase().trim()
  return lower === "about:blank" || lower === "/blank" || lower === "blank" || lower === ""
}

function trackIframeRoute() {
  try {
    const desktopEl = desktopIframeRef.value
    const mobileEl = mobileIframeRef.value

    const desktopWin = desktopEl?.isConnected ? (desktopEl.contentWindow as any) : null
    const mobileWin = mobileEl?.isConnected ? (mobileEl.contentWindow as any) : null

    const desktopPath = desktopWin?.location?.pathname
    const mobilePath = mobileWin?.location?.pathname

    // Auto-recover if currentIframeRoute was accidentally set to /blank
    if (isInvalidPath(currentIframeRoute.value)) {
      currentIframeRoute.value = "/dashboard"
    }

    // 1. Check Desktop Frame Navigation
    if (desktopPath && !isInvalidPath(desktopPath) && desktopPath !== currentIframeRoute.value) {
      currentIframeRoute.value = desktopPath
      const matched = screens.find((s) => s.route === desktopPath)
      if (matched && matched.id !== activeScreenId.value) {
        activeScreenId.value = matched.id
      }
      // Sync Mobile frame to match Desktop
      if (mobileWin && mobilePath && !isInvalidPath(mobilePath) && mobilePath !== desktopPath) {
        if (mobileWin.__nuxt_router__) {
          mobileWin.__nuxt_router__.push(desktopPath)
        } else if (mobileWin.location) {
          mobileWin.location.href = desktopPath
        }
      }
    }
    // 2. Check Mobile Frame Navigation
    else if (mobilePath && !isInvalidPath(mobilePath) && mobilePath !== currentIframeRoute.value) {
      currentIframeRoute.value = mobilePath
      const matched = screens.find((s) => s.route === mobilePath)
      if (matched && matched.id !== mobilePath) {
        const m = screens.find((s) => s.route === mobilePath)
        if (m) activeScreenId.value = m.id
      }
      // Sync Desktop frame to match Mobile
      if (desktopWin && desktopPath && !isInvalidPath(desktopPath) && desktopPath !== mobilePath) {
        if (desktopWin.__nuxt_router__) {
          desktopWin.__nuxt_router__.push(mobilePath)
        } else if (desktopWin.location) {
          desktopWin.location.href = mobilePath
        }
      }
    }
  } catch {
    // Ignore cross-origin errors if any
  }
}

async function fetchCommentCounts() {
  try {
    const list = await api.get<any[]>("/comments")
    const map: Record<string, number> = {}
    list.forEach((c) => {
      if (c.screenId) map[c.screenId] = (map[c.screenId] || 0) + 1
      if (c.route) map[c.route] = (map[c.route] || 0) + 1
    })
    commentCounts.value = map
  } catch (e) {
    console.error(e)
  }
}

async function switchToUser(u: string, p: string) {
  isLoadingAuth.value = true
  try {
    const loggedIn = await login(u, p)
    const adminOnlyRoutes = ["/settings", "/reports", "/reports/sale", "/supplier-payment", "/expense"]
    if (isInvalidPath(currentIframeRoute.value) || (loggedIn.role !== "admin" && adminOnlyRoutes.includes(currentIframeRoute.value))) {
      currentIframeRoute.value = "/dashboard"
      const dashScreen = screens.find((s) => s.route === "/dashboard")
      if (dashScreen) activeScreenId.value = dashScreen.id
    }
    refreshFrames()
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingAuth.value = false
  }
}

function selectScreen(s: typeof screens[0]) {
  if (!s || isInvalidPath(s.route)) return
  activeScreenId.value = s.id
  currentIframeRoute.value = s.route

  try {
    const desktopEl = desktopIframeRef.value
    const mobileEl = mobileIframeRef.value

    const desktopWin = desktopEl?.isConnected ? (desktopEl.contentWindow as any) : null
    const mobileWin = mobileEl?.isConnected ? (mobileEl.contentWindow as any) : null

    if (desktopWin?.__nuxt_router__) {
      if (desktopWin.location?.pathname !== s.route) {
        desktopWin.__nuxt_router__.push(s.route)
      }
    } else if (desktopWin?.location && !isInvalidPath(desktopWin.location.pathname) && desktopWin.location.pathname !== s.route) {
      desktopWin.location.href = s.route
    }

    if (mobileWin?.__nuxt_router__) {
      if (mobileWin.location?.pathname !== s.route) {
        mobileWin.__nuxt_router__.push(s.route)
      }
    } else if (mobileWin?.location && !isInvalidPath(mobileWin.location.pathname) && mobileWin.location.pathname !== s.route) {
      mobileWin.location.href = s.route
    }
  } catch (e) {
    console.error(e)
  }
}

function refreshFrames() {
  iframeKey.value++
}
</script>

<template>
  <div class="min-h-screen bg-[#061121] text-white font-sans flex flex-col selection:bg-[#00b4c8]">
    <!-- DESKTOP TOP BAR & NAVIGATION HEADER (hidden lg:block) -->
    <div class="hidden lg:block">
      <header class="sticky top-0 z-50 bg-[#0c223c] border-b border-white/15 px-8 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <!-- Title Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#00b4c8] flex items-center justify-center shadow-lg shadow-[#00b4c8]/25 flex-shrink-0">
            <svg viewBox="0 0 32 32" fill="none" class="w-6 h-6">
              <circle cx="16" cy="11" r="7" fill="white" opacity="0.9" />
              <path d="M4 26c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-extrabold text-white">
                Soksomnang Real Code Showcase
              </h1>
              <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                ⚡ LIVE CODE (3 BRANCHES)
              </span>
            </div>
            <p class="text-xs text-cyan-300">
              Standalone Vercel App · Dynamic Page Route & Comment Tracking 💬
            </p>
          </div>
        </div>

        <!-- Live User & Branch Switcher -->
        <div class="flex flex-wrap items-center gap-1.5 bg-[#040a14] p-1.5 rounded-xl border border-white/10">
          <span class="text-xs text-gray-300 font-semibold px-1">Switch User:</span>
          <button
            v-for="prof in userProfiles"
            :key="prof.username"
            @click="switchToUser(prof.username, prof.pass)"
            :disabled="isLoadingAuth"
            class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            :class="
              user?.username === prof.username
                ? 'bg-[#00b4c8] text-white shadow-md ring-2 ring-cyan-300/40'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
            "
          >
            {{ prof.label }}
          </button>
        </div>

        <!-- Viewport Display Mode Selector -->
        <div class="flex items-center bg-[#040a14] p-1 rounded-xl border border-white/10">
          <button
            @click="displayMode = 'side'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="displayMode === 'side' ? 'bg-[#00b4c8] text-white' : 'text-gray-300 hover:text-white'"
          >
            Side-by-Side View
          </button>
          <button
            @click="displayMode = 'desktop'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="displayMode === 'desktop' ? 'bg-[#00b4c8] text-white' : 'text-gray-300 hover:text-white'"
          >
            Desktop Frame
          </button>
          <button
            @click="displayMode = 'mobile'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            :class="displayMode === 'mobile' ? 'bg-[#00b4c8] text-white' : 'text-gray-300 hover:text-white'"
          >
            Mobile Frame
          </button>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <button
            @click="showCommentsSection = !showCommentsSection"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5"
            :class="showCommentsSection ? 'bg-cyan-600 text-white border-cyan-400 shadow' : 'bg-white/10 text-gray-200 border-white/10 hover:bg-white/20'"
          >
            <span>💬 មតិយោបល់ (Comments)</span>
          </button>
          <button
            @click="refreshFrames"
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            🔄 Reload UI
          </button>
          <a
            :href="currentIframeRoute"
            target="_blank"
            class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
          >
            Open Full Page ↗
          </a>
        </div>
      </header>

      <!-- Sub-header Filter & Screen Selector -->
      <div class="bg-[#091a2f] border-b border-white/10 px-8 py-3 space-y-2">
        <!-- Category Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectedCategory = cat.id as Category"
            class="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border"
            :class="
              selectedCategory === cat.id
                ? 'bg-[#00b4c8] text-white border-[#00b4c8]'
                : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/15 hover:text-white'
            "
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Screen Selector Buttons -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="s in filteredScreens"
            :key="s.id"
            @click="selectScreen(s)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border"
            :class="
              activeScreenId === s.id
                ? 'bg-cyan-600 text-white border-cyan-400 font-bold ring-2 ring-cyan-400/50 shadow'
                : 'bg-[#0d2645] text-gray-200 border-white/10 hover:bg-white/15 hover:text-white'
            "
          >
            <span>{{ s.title }}</span>
            <span
              v-if="commentCounts[s.id] || commentCounts[s.route]"
              class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500 text-white"
            >
              💬 {{ commentCounts[s.id] || commentCounts[s.route] }}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/50 text-cyan-300">
              {{ s.route }}
            </span>
          </button>
        </div>
      </div>

      <!-- Active Screen Header Info -->
      <div class="bg-[#0b203a] px-8 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-[#00b4c8]/20 text-[#00b4c8] border border-[#00b4c8]/40">
            {{ activeScreen.badge }}
          </span>
          <h2 class="text-base font-bold text-white">
            {{ activeScreen.title }}
          </h2>
          <span class="text-xs text-gray-300">({{ activeScreen.description }})</span>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs text-cyan-300 bg-black/40 px-2.5 py-1 rounded font-mono border border-white/10">
            Current Route: {{ currentIframeRoute }}
          </span>
          <span class="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
            👤 {{ user?.name || 'Admin' }} ({{ user?.username || 'admin' }})
          </span>
        </div>
      </div>
    </div>

    <!-- MOBILE COMPACT CONTROL BAR (lg:hidden) -->
    <header class="lg:hidden sticky top-0 z-50 bg-[#0c223c] border-b border-white/15 px-3 py-2.5 flex items-center justify-between gap-2 shadow-xl">
      <!-- App Title -->
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[#00b4c8] flex items-center justify-center shadow flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" class="w-5 h-5">
            <circle cx="16" cy="11" r="7" fill="white" opacity="0.9" />
            <path d="M4 26c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7" />
          </svg>
        </div>
        <span class="font-extrabold text-xs text-white truncate">Soksomnang</span>
      </div>

      <!-- Quick Screen Selector Dropdown -->
      <div class="flex-1 max-w-[170px] min-w-0">
        <select
          :value="activeScreenId"
          @change="(e: any) => selectScreenById(e.target.value)"
          class="w-full bg-[#040a14] border border-cyan-400/40 text-cyan-200 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none truncate"
        >
          <option v-for="s in screens" :key="s.id" :value="s.id">
            {{ s.title.split(' ')[0] }} ({{ s.route }})
          </option>
        </select>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Direct Mobile Comments Popup Toggle -->
        <button
          @click="showCommentsModal = true"
          class="px-2.5 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow"
          title="Open comments popup"
        >
          <span>💬</span>
        </button>

        <!-- Controls Drawer Toggle Button -->
        <button
          @click="showMobileControlsDrawer = !showMobileControlsDrawer"
          class="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
        >
          <span>⚙️ Menu</span>
        </button>
      </div>
    </header>

    <!-- MOBILE CONTROLS SLIDE-UP DRAWER MODAL -->
    <Transition name="fade">
      <div v-if="showMobileControlsDrawer" class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm lg:hidden" @click.self="showMobileControlsDrawer = false">
        <div class="w-full bg-[#0c223c] border-t border-white/20 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl text-xs">
          <div class="flex items-center justify-between border-b border-white/10 pb-2">
            <span class="font-extrabold text-sm text-cyan-300">🎛️ Showcase Controls</span>
            <button @click="showMobileControlsDrawer = false" class="px-2.5 py-1 rounded-full bg-white/10 text-white font-bold">✕ បិទ</button>
          </div>

          <!-- User Switcher -->
          <div class="space-y-1.5">
            <span class="text-gray-300 font-semibold">Switch User:</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="prof in userProfiles"
                :key="prof.username"
                @click="switchToUser(prof.username, prof.pass); showMobileControlsDrawer = false"
                class="px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left truncate"
                :class="user?.username === prof.username ? 'bg-[#00b4c8] text-white' : 'bg-white/10 text-gray-300'"
              >
                {{ prof.label }}
              </button>
            </div>
          </div>

          <!-- Viewport Mode -->
          <div class="space-y-1.5">
            <span class="text-gray-300 font-semibold">Viewport Mode:</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                @click="displayMode = 'side'; showMobileControlsDrawer = false"
                class="py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                :class="displayMode === 'side' ? 'bg-[#00b4c8] text-white' : 'bg-white/10 text-gray-300'"
              >Side View</button>
              <button
                @click="displayMode = 'desktop'; showMobileControlsDrawer = false"
                class="py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                :class="displayMode === 'desktop' ? 'bg-[#00b4c8] text-white' : 'bg-white/10 text-gray-300'"
              >Desktop</button>
              <button
                @click="displayMode = 'mobile'; showMobileControlsDrawer = false"
                class="py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                :class="displayMode === 'mobile' ? 'bg-[#00b4c8] text-white' : 'bg-white/10 text-gray-300'"
              >Mobile</button>
            </div>
          </div>

          <!-- Action Links -->
          <div class="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              @click="showCommentsModal = true; showMobileControlsDrawer = false"
              class="flex-1 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white text-center shadow"
            >
              💬 មតិយោបល់ Popup
            </button>
            <a
              :href="currentIframeRoute"
              target="_blank"
              class="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white text-center"
            >
              Full Page ↗
            </a>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Main Live Code Frames Viewport Container -->
    <main class="flex-1 p-4 lg:p-6 space-y-6">
      <div
        class="grid gap-6 items-start"
        :class="{
          'grid-cols-1 lg:grid-cols-12': displayMode === 'side',
          'grid-cols-1': displayMode === 'desktop' || displayMode === 'mobile'
        }"
      >
        <!-- DESKTOP FRAME -->
        <div
          v-if="displayMode === 'side' || displayMode === 'desktop'"
          class="space-y-2"
          :class="displayMode === 'side' ? (showCommentsSection ? 'lg:col-span-5' : 'lg:col-span-8') : 'w-full'"
        >
          <div class="flex items-center justify-between text-xs text-gray-300 font-bold px-1">
            <span class="text-cyan-300 flex items-center gap-1.5">
              🖥️ Desktop Viewport (Live Interactive Code UI)
            </span>
            <span class="text-emerald-400">🟢 Vercel Serverless JSON DB</span>
          </div>

          <!-- Desktop Frame Container -->
          <div class="rounded-xl bg-[#1a2638] border-2 border-gray-700 shadow-2xl overflow-hidden">
            <!-- Browser Address Bar -->
            <div class="bg-[#0e1726] px-4 py-2 border-b border-gray-800 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded-full bg-red-500" />
                <div class="w-3 h-3 rounded-full bg-yellow-500" />
                <div class="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div class="px-4 py-0.5 rounded bg-[#1e2d42] text-xs font-mono text-cyan-200 w-full max-w-sm text-center border border-white/10 truncate">
                {{ currentIframeRoute }}
              </div>
              <div class="text-[11px] font-mono text-gray-400">Desktop Widescreen</div>
            </div>

            <!-- Desktop Live Iframe -->
            <div class="w-full h-[720px] bg-white overflow-hidden">
              <iframe
                ref="desktopIframeRef"
                :key="`desktop-single-${iframeKey}`"
                src="/dashboard"
                class="w-full h-full border-0 bg-white"
                title="Desktop Live Code Frame"
              />
            </div>
          </div>
        </div>

        <!-- TRUE MOBILE PHONE FRAME -->
        <div
          v-if="displayMode === 'side' || displayMode === 'mobile'"
          class="space-y-2"
          :class="displayMode === 'side' ? (showCommentsSection ? 'lg:col-span-3' : 'lg:col-span-4') : 'max-w-[420px] mx-auto w-full'"
        >
          <div class="hidden lg:flex items-center justify-between text-xs text-gray-300 font-bold px-1">
            <span class="text-cyan-300 flex items-center gap-1.5">
              📱 Mobile Viewport (390 × 844)
            </span>
            <span class="text-emerald-400">🟢 Responsive</span>
          </div>

          <!-- Phone Outer Frame Container -->
          <div class="rounded-2xl lg:rounded-[44px] bg-[#0c121d] p-1.5 lg:p-3 border-2 lg:border-4 border-gray-700 shadow-2xl max-w-[390px] mx-auto flex flex-col">
            <!-- iPhone Top Status Bar & Dynamic Island (Desktop Frame only) -->
            <div class="hidden lg:flex bg-black text-white px-5 pt-2 pb-1.5 rounded-t-[32px] items-center justify-between text-[11px] font-semibold relative select-none">
              <span class="font-bold text-gray-200">9:41</span>

              <!-- Dynamic Island Notch Pill -->
              <div class="w-24 h-4 bg-[#141b26] rounded-full flex items-center justify-end px-2 border border-white/10">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-900 border border-blue-400/50" />
              </div>

              <div class="flex items-center gap-1 text-[10px] text-gray-300 font-mono">
                <span>5G</span>
                <span>🔋</span>
              </div>
            </div>

            <!-- Mobile Live Iframe Container -->
            <div class="rounded-xl lg:rounded-b-[32px] overflow-hidden bg-white h-[660px] lg:h-[720px] w-full relative shadow-inner">
              <iframe
                ref="mobileIframeRef"
                :key="`mobile-single-${iframeKey}`"
                src="/dashboard"
                class="w-full h-full border-0 bg-white"
                title="Mobile Live Code Frame"
              />
            </div>
          </div>
        </div>

        <!-- 💬 REALTIME COMMENTS SECTION (Desktop Side-by-Side Only) -->
        <div
          v-if="showCommentsSection && displayMode === 'side'"
          class="hidden lg:block space-y-2 lg:col-span-4"
        >
          <PageCommentWidget
            :screen-id="activeScreen.id"
            :screen-title="activeScreen.title"
            :route="currentIframeRoute"
          />
        </div>
      </div>
    </main>

    <!-- 💬 REALTIME COMMENTS POPUP MODAL (Mobile & Desktop Overlay) -->
    <Transition name="fade">
      <div
        v-if="showCommentsModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
        @click.self="showCommentsModal = false"
      >
        <div class="w-full max-w-xl max-h-[90vh] flex flex-col space-y-2">
          <!-- Top Bar with Close Button -->
          <div class="flex items-center justify-between px-2">
            <span class="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
              💬 មតិយោបល់ទំព័រ (Comments Popup)
            </span>
            <button
              @click="showCommentsModal = false"
              class="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all border border-white/20"
            >
              ✕ បិទ (Close)
            </button>
          </div>

          <!-- Page Comment Widget Container -->
          <div class="overflow-y-auto max-h-[82vh] rounded-2xl shadow-2xl">
            <PageCommentWidget
              :screen-id="activeScreen.id"
              :screen-title="activeScreen.title"
              :route="currentIframeRoute"
            />
          </div>
        </div>
      </div>
    </Transition>

    <!-- Footer -->
    <footer class="border-t border-white/10 py-4 text-center text-xs text-gray-400 bg-[#040a14]">
      Soksomnang Standalone Showcase App · Vercel Frontend Only
    </footer>
  </div>
</template>
