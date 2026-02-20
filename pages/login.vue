<script setup lang="ts">
/**
 * Login Page Controller
 * Bu sayfa, AuthForm bileşenini sarmallar ve kullanıcı oturum durumuna göre
 * yönlendirme (routing) mantığını yönetir.
 */

// nuxt-auth-utils hook'u üzerinden oturum durumunu çekiyoruz.
const { loggedIn } = useUserSession()

/**
 * NOTE: Client-side Navigation Guard
 * Kullanıcı zaten authenticated durumdaysa, 
 * login sayfasını görmesini engelleyip doğrudan root path'e push ediyoruz.
 */
watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    // Reactive redirect logic
    navigateTo('/')
  }
}, { immediate: true }) // İlk mount anında check etmesi için immediate: true
</script>

<template>
  <div class="login-page-wrapper">
    
    <div class="login-header-container">
      <h2 class="login-page-title">
        Hesabınıza Giriş Yapın
      </h2>
    </div>

    <div class="login-form-container">
      <AuthForm />
    </div>

  </div>
</template>

<style scoped src="~/assets/css/components/login-page.css"></style>