/**
 * Logout Handler
 * Kullanıcının mevcut session'ını sonlandırır ve kimlik bilgilerini temizler.
 */
export default defineEventHandler(async (event) => {
  
  // NOTE: Session termination. 
  // 'nuxt-auth-utils' üzerinden client tarafındaki session cookie'sini invalidate ediyoruz.
  await clearUserSession(event)

  // NOTE: Post-logout cleanup.
  // Gerekirse burada cache temizliği veya audit log işlemleri yapılabilir.
  console.log(`[AUTH] Session destroyed successfully.`);

  return { 
    success: true,
    message: 'Oturumunuz güvenli bir şekilde sonlandırılmıştır.'
  }
})