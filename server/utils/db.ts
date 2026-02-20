import mongoose from "mongoose";

/**
 * MongoDB Connection Utility
 * NOTE: Serverless ortamlarda (Nitro/Lambda) her istekte yeni bağlantı açılmasını
 * engellemek için mevcut bağlantı durumunu (readyState) kontrol ediyoruz.
 */
export default async function dbConnect() {
  // Check if there is an active or connecting instance
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // NOTE: Güvenlik ve çevre yönetimi (Environment Management) gereği 
  // bağlantı bilgilerini doğrudan kod içinde değil, Nuxt Runtime Config üzerinden alıyoruz.
  const config = useRuntimeConfig();

  // Validate configuration availability
  if (!config.mongoUri) {
    console.error("❌ CRITICAL ERROR: MONGO_URI is undefined in runtime config.");
    throw new Error("Veritabanı bağlantı yapılandırması (MONGO_URI) eksik veya hatalı.");
  }

  try {
    // Attempt to establish connection with Mongoose
    // NOTE: Connection pooling ve timeout ayarları varsayılan olarak optimize edilmiştir.
    await mongoose.connect(config.mongoUri as string);
    
    console.log("✅ [Database] MongoDB connection established successfully.");
  } catch (error) {
    console.error("❌ [Database] Connection failure:", error);
    
    // Uygulamanın tutarsız veriyle çalışmasını engellemek için hatayı yukarı fırlatıyoruz (Fail-fast)
    throw error;
  }
}