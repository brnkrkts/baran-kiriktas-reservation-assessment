// types/auth.d.ts

/**
 * Auth Utils Module Augmentation
 * Nuxt Auth Utils kütüphanesinin sağladığı default User ve Session tiplerini
 * proje ihtiyaçlarımıza göre extend ediyoruz (genişletiyoruz).
 */
declare module '#auth-utils' {
  interface User {
    // NOTE: Session içerisinde serialize edilip saklanacak core kullanıcı dataları.
    // Client tarafında 'useUserSession' üzerinden bu proplara erişim sağlanır.
    name: string
    email: string
  }

  interface UserSession {
    // NOTE: Base session objesini, yukarıda tanımladığımız typed User interface'i ile sarmallıyoruz.
    // Gerektiğinde session seviyesinde metadata (örn: loggedInAt, ipAddress) eklemek için burası kullanılır.
    user: User
  }
}

// TypeScript compiler'ın bu dosyayı bir modül (SFC) olarak tanıması için gerekli boş export.
export {}