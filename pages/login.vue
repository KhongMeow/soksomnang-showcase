<script setup lang="ts">
definePageMeta({ layout: "default" })
const { login } = useAuth()
const router = useRouter()

const username = ref("")
const password = ref("")
const showPass = ref(false)
const remember = ref(false)
const error = ref("")
const loading = ref(false)

async function handleLogin(e: Event) {
  e.preventDefault()
  if (!username.value || !password.value) {
    error.value = "សូមបញ្ចូលឈ្មោះ និងលេខសម្ងាត់"
    return
  }
  error.value = ""
  loading.value = true
  try {
    await login(username.value, password.value)
    router.push("/dashboard")
  } catch (err: any) {
    error.value =
      err?.data?.message || "ឈ្មោះអ្នកប្រើ ឬលេខសម្ងាត់មិនត្រឹមត្រូវ"
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f2a4a] via-[#1a4a7a] to-[#0f2a4a] flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto rounded-3xl bg-[#00b4c8] flex items-center justify-center shadow-2xl mb-4">
          <svg viewBox="0 0 48 48" fill="none" class="w-12 h-12">
            <circle cx="24" cy="16" r="10" fill="white" opacity="0.9" />
            <path d="M8 36c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.7" />
            <path d="M20 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#0f2a4a" stroke-width="2" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white mb-1">Soksomnang</h1>
        <p class="text-[#00b4c8] text-sm font-medium">ប្រព័ន្ធគ្រប់គ្រងស្តុក និងការលក់មាន់</p>
        <div class="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
          <span class="text-xs text-white/70">🇰🇭</span>
          <span class="text-xs text-white/70 font-medium">ភាសាខ្មែរ</span>
        </div>
      </div>

      <div class="bg-white rounded-3xl shadow-2xl p-7">
        <h2 class="text-lg font-bold text-[#0f2a4a] mb-6">ចូលប្រើប្រាស់</h2>

        <form @submit="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-1.5">
              ឈ្មោះអ្នកប្រើ / លេខទូរស័ព្ទ
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="admin ឬ staff"
              class="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base transition-colors"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-1.5">
              លេខសម្ងាត់
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPass ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#00b4c8] outline-none text-base transition-colors"
              />
              <button
                type="button"
                @click="showPass = !showPass"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg v-if="showPass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="remember = !remember"
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              :class="remember ? 'bg-[#00b4c8] border-[#00b4c8]' : 'border-gray-300'"
            >
              <svg v-if="remember" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" class="w-3 h-3"><path d="M20 6L9 17l-5-5" /></svg>
            </button>
            <span class="text-sm text-gray-600">ចងចាំ</span>
          </div>

          <div v-if="error" class="flex items-center gap-2 bg-[#fef2f2] border border-[#fca5a5] rounded-xl px-4 py-3">
            <span class="text-[#dc2626] text-sm font-medium">{{ error }}</span>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-4 bg-[#0f2a4a] hover:bg-[#1a4a7a] text-white font-bold text-base rounded-xl transition-colors shadow-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ loading ? "កំពុងចូល..." : "ចូលប្រើ" }}
          </button>
        </form>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-xs text-gray-400 text-center">
            Admin: admin/admin · Staff: staff/staff
          </p>
        </div>
      </div>

      <p class="text-center text-white/40 text-xs mt-6">
        Soksomnang System v1.0 · BakseyTECH
      </p>
    </div>
  </div>
</template>
