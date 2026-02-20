import { User } from "~/server/models/User";
import bcrypt from "bcrypt";
import dbConnect from "~/server/utils/db";
import { loginSchema } from "~/server/utils/validation";
import { z } from "zod";

/**
 * Login Handler
 * Kullanıcı kimlik bilgilerini Zod ile validate eder, parola kontrolü yapar 
 * ve başarılı ise session initialize eder.
 */
export default defineEventHandler(async (event) => {
  // Veritabanı bağlantısı check ediliyor
  await dbConnect();
  
  // Request'ten gelen raw body alınıyor
  const body = await readBody(event);

  try {
    /**
     * NOTE: Schema Parsing & Validation
     * Body'den gelen datayı loginSchema üzerinden parse ediyoruz.
     * Zod burada e-postayı trim'ler ve küçük harfe (toLowerCase) çevirerek normalize eder.
     */
    const { email, password } = loginSchema.parse(body);

    /**
     * NOTE: User Lookup
     * E-posta adresi üzerinden persistence layer'da (DB) kullanıcıyı sorguluyoruz.
     */
    const user = await User.findOne({ email });
    
    /**
     * NOTE: Security Best Practice (Generic Error)
     * "E-posta bulunamadı" veya "Şifre yanlış" gibi spesifik hatalar dönmüyoruz.
     * Brute-force saldırganlarına ipucu vermemek için jenerik bir 401 hatası handle ediyoruz.
     */
    if (!user) {
      console.warn(`[AUTH] Login failed: User not found -> ${email}`);
      throw createError({
        statusCode: 401,
        message: "Girdiğiniz kimlik bilgileri sistemdekilerle eşleşmemektedir.",
      });
    }

    /**
     * NOTE: Password Comparison
     * Gelen plain-text parolayı, DB'deki hashlenmiş veriyle güvenli şekilde compare ediyoruz.
     */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[AUTH] Login failed: Password mismatch -> ${email}`);
      throw createError({
        statusCode: 401,
        message: "Girdiğiniz kimlik bilgileri sistemdekilerle eşleşmemektedir.",
      });
    }

    /**
     * NOTE: Session Initialization
     * Kimlik doğrulama başarılı! Kullanıcı bilgilerini session içine hydrate ediyoruz.
     */
    await setUserSession(event, {
      user: { name: user.name, email: user.email },
    });
    
    // Audit log
    console.log(`✅ [AUTH] User successfully authenticated via Zod: ${email}`);

    return { 
      success: true, 
      message: "Giriş işlemi başarıyla tamamlandı. Hoş geldiniz!" 
    };

  } catch (error) {
    /**
     * NOTE: Validation Catch Block
     * Eğer payload Zod şemasına uymazsa (eksik input vb.), 
     * issues array'inden gelen ilk hatayı client'a push ediyoruz.
     */
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.issues[0]?.message ?? "Giriş bilgileri geçersiz formatta.",
      });
    }
    
    // Uygulama seviyesindeki diğer hataları (500 vb.) fırlat
    throw error;
  }
});