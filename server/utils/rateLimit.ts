import { H3Event } from 'h3';

/**
 * Rate Limiting Middleware Utility
 * NOTE: Servis kalitesini korumak ve brute-force saldırılarını engellemek için
 * IP tabanlı istek sınırlandırma mekanizmasıdır.
 */

// In-memory store for rate limiting. 
// Production'da Redis gibi dağıtık bir yapıya taşınması önerilir.
const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

const WINDOW_MS = 60 * 1000;    // 1 dakikalık pencere (Time-window)
const MAX_REQUESTS = 10;        // Pencere başına izin verilen max request

export const checkRateLimit = (event: H3Event) => {
  // Client IP adresi resolve ediliyor
  const ip = getRequestHeader(event, 'x-forwarded-for') || getRequestIP(event) || 'unknown';
  
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Yeni IP için kayıt oluştur (First-time request)
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return;
  }

  // NOTE: Sliding window mantığıyla süre dolduysa sayacı resetle
  if (now - record.lastReset > WINDOW_MS) {
    record.count = 1;
    record.lastReset = now;
  } else {
    // Mevcut pencere içinde counter'ı increment et
    record.count++;
    
    // Threshold kontrolü
    if (record.count > MAX_REQUESTS) {
      console.warn(`[SECURITY] Rate limit exceeded for IP: ${ip}`);
      
      throw createError({
        statusCode: 429,
        message: "Çok fazla istek gönderildi. Güvenlik nedeniyle lütfen bir süre bekledikten sonra tekrar deneyiniz."
      });
    }
  }
};