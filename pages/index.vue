<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isLoggedIn, role } = useAuth()

type DisplayMode = "side" | "desktop" | "mobile"
type Category = "all" | "auth" | "sales" | "stock" | "purchasing" | "finance"

const displayMode = ref<DisplayMode>("side")
const selectedCategory = ref<Category>("all")
const activeScreenId = ref<string>("admin-dashboard")
const isLoadingAuth = ref(false)
const iframeKey = ref(0)

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

const filteredScreens = computed(() => {
  if (selectedCategory.value === "all") return screens
  return screens.filter((s) => s.category === selectedCategory.value)
})

const activeScreen = computed(() => {
  return screens.find((s) => s.id === activeScreenId.value) || screens[0]
})

onMounted(async () => {
  if (!isLoggedIn.value) {
    await switchToAdmin()
  }
})

async function switchToAdmin() {
  isLoadingAuth.value = true
  try {
    await login("admin", "admin")
    refreshFrames()
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingAuth.value = false
  }
}

async function switchToStaff() {
  isLoadingAuth.value = true
  try {
    await login("staff", "staff")
    refreshFrames()
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingAuth.value = false
  }
}

function refreshFrames() {
  iframeKey.value++
}
</script>

<template>
  <div class="min-h-screen bg-[#061121] text-white font-sans flex flex-col selection:bg-[#00b4c8]">
    <!-- Top Bar Navigation Header -->
    <header class="sticky top-0 z-50 bg-[#0c223c] border-b border-white/15 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
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
              Soksomnang Real Code Prototype Showcase
            </h1>
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
              ⚡ LIVE CODE UI (JSON DB)
            </span>
          </div>
          <p class="text-xs text-cyan-300">
            Standalone Vercel App · Desktop & Mobile Live Frames
          </p>
        </div>
      </div>

      <!-- Live Role Switcher -->
      <div class="flex items-center gap-2 bg-[#040a14] px-3 py-1.5 rounded-xl border border-white/10">
        <span class="text-xs text-gray-300 font-semibold">Switch Role:</span>
        <button
          @click="switchToAdmin"
          :disabled="isLoadingAuth"
          class="px-3 py-1 rounded-lg text-xs font-bold transition-all"
          :class="role === 'admin' ? 'bg-[#00b4c8] text-white shadow' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'"
        >
          👑 Admin
        </button>
        <button
          @click="switchToStaff"
          :disabled="isLoadingAuth"
          class="px-3 py-1 rounded-lg text-xs font-bold transition-all"
          :class="role === 'sale_staff' ? 'bg-[#00b4c8] text-white shadow' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'"
        >
          👤 Staff
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
          @click="refreshFrames"
          class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
        >
          🔄 Reload UI
        </button>
        <a
          :href="activeScreen.route"
          target="_blank"
          class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
        >
          Open Full Page ↗
        </a>
      </div>
    </header>

    <!-- Sub-header Filter & Screen Selector -->
    <div class="bg-[#091a2f] border-b border-white/10 px-4 lg:px-8 py-3 space-y-2">
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
          @click="activeScreenId = s.id"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border"
          :class="
            activeScreenId === s.id
              ? 'bg-cyan-600 text-white border-cyan-400 font-bold ring-2 ring-cyan-400/50 shadow'
              : 'bg-[#0d2645] text-gray-200 border-white/10 hover:bg-white/15 hover:text-white'
          "
        >
          <span>{{ s.title }}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/50 text-cyan-300">
            {{ s.route }}
          </span>
        </button>
      </div>
    </div>

    <!-- Active Screen Header Info -->
    <div class="bg-[#0b203a] px-4 lg:px-8 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-[#00b4c8]/20 text-[#00b4c8] border border-[#00b4c8]/40">
          {{ activeScreen.badge }}
        </span>
        <h2 class="text-base font-bold text-white">
          {{ activeScreen.title }}
        </h2>
        <span class="text-xs text-gray-300">({{ activeScreen.description }})</span>
      </div>

      <div class="text-xs font-mono text-cyan-300 bg-black/40 px-3 py-1 rounded border border-white/10">
        {{ activeScreen.route }}
      </div>
    </div>

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
          :class="displayMode === 'side' ? 'lg:col-span-8' : 'w-full'"
        >
          <div class="flex items-center justify-between text-xs text-gray-300 font-bold px-1">
            <span class="text-cyan-300 flex items-center gap-1.5">
              🖥️ Desktop Viewport (1440 × 900 Live Interactive Code UI)
            </span>
            <span class="text-emerald-400">🟢 Standalone Vercel Serverless JSON DB</span>
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
                {{ activeScreen.route }}
              </div>
              <div class="text-[11px] font-mono text-gray-400">Desktop Widescreen</div>
            </div>

            <!-- Desktop Live Iframe -->
            <div class="w-full h-[720px] bg-white overflow-hidden">
              <iframe
                :key="`desktop-${activeScreen.id}-${iframeKey}`"
                :src="activeScreen.route"
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
          :class="displayMode === 'side' ? 'lg:col-span-4' : 'max-w-[420px] mx-auto w-full'"
        >
          <div class="flex items-center justify-between text-xs text-gray-300 font-bold px-1">
            <span class="text-cyan-300 flex items-center gap-1.5">
              📱 Mobile Viewport (390 × 844 True Mobile Layout)
            </span>
            <span class="text-emerald-400">🟢 Responsive UI</span>
          </div>

          <!-- Phone Outer Frame -->
          <div class="rounded-[40px] bg-[#0c121d] p-3 border-4 border-gray-700 shadow-2xl max-w-[390px] mx-auto relative">
            <!-- iPhone Dynamic Island -->
            <div class="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
              <div class="w-2 h-2 rounded-full bg-blue-900 border border-blue-400/50" />
            </div>

            <!-- Mobile Live Iframe Container -->
            <div class="rounded-[30px] overflow-hidden bg-white h-[740px] w-full relative shadow-inner">
              <iframe
                :key="`mobile-${activeScreen.id}-${iframeKey}`"
                :src="activeScreen.route"
                class="w-full h-full border-0 bg-white"
                title="Mobile Live Code Frame"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-white/10 py-4 text-center text-xs text-gray-400 bg-[#040a14]">
      Soksomnang Standalone Showcase App · Vercel Frontend Only
    </footer>
  </div>
</template>
