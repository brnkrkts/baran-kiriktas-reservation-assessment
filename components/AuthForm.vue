<script setup lang="ts">
// Session management hook (nuxt-auth-utils)
const { fetch } = useUserSession()

// --- UI & Form States ---
const isLoginMode = ref(true) // Toggle state for Login / Register view
const loading = ref(false)    // Prevent double submission
const errorMsg = ref('')

// Form payload object
const form = ref({
  name: '',
  email: '',
  password: ''
})

// --- Core Handlers ---
const handleSubmit = async () => {
  // Pre-fetch state resets
  loading.value = true
  errorMsg.value = ''
  
  // Mode'a göre dynamic endpoint resolve ediliyor
  const endpoint = isLoginMode.value ? '/api/auth/login' : '/api/auth/register'

  try {
    // Backend API request (Payload form.value üzerinden gidiyor)
    await $fetch(endpoint, {
      method: 'POST',
      body: form.value
    })
    
    // İşlem başarılı! Client tarafındaki session datasını hydrate (update) et
    await fetch()
    
  } catch (err: any) {
    // Exception handling: Backend'den fırlatılan custom error mesajını extract et, yoksa default mesaj bas
    errorMsg.value = err.data?.message || 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.'
  } finally {
    // İşlem bittiğinde loading state'i release et (Success veya Fail fark etmeksizin)
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-card">
    <h2 class="auth-title">
      {{ isLoginMode ? 'Sisteme Giriş Yapın' : 'Yeni Hesap Oluşturun' }}
    </h2>
    
    <form @submit.prevent="handleSubmit" class="auth-form">
      
      <div v-if="!isLoginMode" class="form-group">
        <label class="label-text">Ad Soyad</label>
        <input 
          v-model="form.name" 
          type="text" 
          class="input-field" 
          placeholder="Örn: Ahmet Yılmaz" 
          required
        >
      </div>
      
      <div class="form-group">
        <label class="label-text">E-Posta Adresi</label>
        <input 
          v-model="form.email" 
          type="email" 
          class="input-field" 
          placeholder="ornek@sirket.com" 
          required
        >
      </div>
      
      <div class="form-group">
        <label class="label-text">Parola</label>
        <input 
          v-model="form.password" 
          type="password" 
          class="input-field" 
          placeholder="••••••••" 
          required
        >
      </div>

      <div v-if="errorMsg" class="error-alert">
        {{ errorMsg }}
      </div>

      <button type="submit" :disabled="loading" class="btn-primary">
        {{ loading ? 'Lütfen Bekleyiniz...' : (isLoginMode ? 'Giriş Yap' : 'Kayıt Ol') }}
      </button>
    </form>

    <footer class="auth-footer">
      <span class="footer-text">{{ isLoginMode ? 'Sistemde henüz hesabınız yok mu?' : 'Zaten bir hesabınız var mı?' }}</span>
      <button 
        type="button" 
        @click="isLoginMode = !isLoginMode; errorMsg = ''" 
        class="btn-toggle"
      >
        {{ isLoginMode ? 'Kayıt Olun' : 'Giriş Yapın' }}
      </button>
    </footer>
  </div>
</template>

<style scoped src="~/assets/css/components/auth.css"></style>