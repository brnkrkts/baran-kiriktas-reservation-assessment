// server/utils/validation.ts
import { z } from 'zod';
import dns from 'node:dns/promises';

/**
 * DNS MX Record Lookup
 * Kullanıcının girdiği e-postanın domain kısmını parse edip,
 * gerçekten mail alabilen bir sunucu (MX record) var mı diye check ediyoruz.
 * Fake veya throwaway maillerle sistemi spamlemelerini engellemek için kritik bir step.
 */
async function checkMxRecord(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Domain'in MX record'larını async olarak resolve et
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch (error) {
    // DNS lookup fail olursa veya record yoksa false dön, Zod validation'ı fail etsin
    return false;
  }
}

/**
 * AUTH SCHEMAS
 * Request body'den gelen payload'ı DB'ye veya Business Logic'e indirmeden önce 
 * Zod ile sanitize ve validate ediyoruz.
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, "Ad soyad bilgisi en az 2 karakterden oluşmalıdır.")
    .trim(), // Baştaki ve sondaki gereksiz whitespace'leri clean et
  
  email: z.string()
    .email("Lütfen geçerli bir e-posta adresi giriniz.")
    .trim()
    .toLowerCase() // Case sensitivity issue'larını handle etmek için DB öncesi normalize et
    .refine(async (email) => {
      // Async MX check atıyoruz, network I/O yaptığı için refine kullanıldı
      return await checkMxRecord(email);
    }, "Belirttiğiniz e-posta adresine ait sunucu (domain) geçersiz veya ulaşılamıyor."),
  
  password: z.string()
    .min(6, "Güvenliğiniz için parolanız en az 6 karakterden oluşmalıdır.")
});

export const loginSchema = z.object({
  email: z.string()
    .email("Lütfen geçerli bir e-posta adresi giriniz.")
    .trim()
    .toLowerCase(),
  
  password: z.string()
    .min(1, "Lütfen parolanızı eksiksiz giriniz.") // Empty string case'ini blockluyoruz
});

/**
 * APPOINTMENT SCHEMAS
 * Frontend'den payload olarak sadece date ve time geliyor.
 * Data integrity sağlamak için regex ile strict bir format checking yapıyoruz.
 */
export const appointmentBodySchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Sistem girdiğiniz tarih formatını işleyemiyor. Lütfen takvim üzerinden geçerli bir seçim yapınız."),
  
  time: z.string()
    .regex(/^\d{2}:\d{2}$/, "Sistem girdiğiniz saat formatını işleyemiyor. Lütfen geçerli saat dilimlerinden birini seçiniz."),
});