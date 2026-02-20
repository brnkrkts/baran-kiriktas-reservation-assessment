import { User } from "~/server/models/User";
import bcrypt from "bcrypt";
import dbConnect from "~/server/utils/db";
import { registerSchema } from "~/server/utils/validation";
import { z } from "zod";

/**
 * Registration Handler
 * Yeni kullanıcı oluşturma, veriyi sanitize/validate etme ve 
 * anında oturum açma (auto-login) süreçlerini yönetir.
 */
export default defineEventHandler(async (event) => {
  // Veritabanı bağlantısı initialize ediliyor
  await dbConnect();
  
  // Client'tan gelen request payload'ı extract ediliyor
  const body = await readBody(event);

  try {
    /**
     * NOTE: Payload Validation & Sanitization
     * Gelen raw datayı Zod şemamızdan geçiriyoruz. MX sorgusu asenkron olduğu için
     * parseAsync kullanıldı. Zod burada trim ve toLowerCase işlemlerini de halleder.
     */
    const validatedData = await registerSchema.parseAsync(body);
    const { name, email, password } = validatedData;

    /**
     * NOTE: Identity Collision Check
     * Validasyonlardan geçen e-posta adresinin DB'de (persistence layer) 
     * halihazırda var olup olmadığını check ediyoruz.
     */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[AUTH] Registration blocked: Identity collision for ${email}`);
      throw createError({
        statusCode: 400,
        message: "Belirtilen e-posta adresi sistemde zaten kayıtlı. Lütfen giriş yapmayı deneyiniz.",
      });
    }

    /**
     * NOTE: Security Layer
     * Parolayı asla plain-text saklamıyoruz. 10 salt rounds ile bcrypt üzerinden hashliyoruz.
     */
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Yeni user document oluşturulup DB'ye persist ediliyor
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    /**
     * NOTE: Session Hydration (Auto-login)
     * Kullanıcıyı kayıt olduktan sonra tekrar login ekranına yollamak UX açısından kötüdür.
     * Bu yüzden Nuxt Auth Utils ile session'ı anında initialize edip içeri alıyoruz.
     */
    await setUserSession(event, {
      user: { name: newUser.name, email: newUser.email },
    });
    
    // Audit log
    console.log(`👤 [AUTH] New user successfully registered & hydrated via Zod: ${name} (${email})`);

    return { 
      success: true, 
      message: "Kaydınız başarıyla oluşturulmuştur. Sisteme yönlendiriliyorsunuz." 
    };

  } catch (error) {
    /**
     * NOTE: Validation Error Handling
     * Zod error fırlattığında, issues array'indeki ilk okunabilir mesajı
     * extract edip client'a 400 (Bad Request) olarak dönüyoruz.
     */
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.issues[0]?.message ?? "Geçersiz veri formatı algılandı.",
      });
    }
    
    // Beklenmeyen sunucu hatalarını (500) yukarı fırlat
    throw error;
  }
});