import { Appointment } from "~/server/models/Appointment";
import dbConnect from "~/server/utils/db";

/**
 * Appointment Deletion Handler
 * Kullanıcının mevcut randevusunu iptal eder ve sistemi real-time senkronize eder.
 */
export default defineEventHandler(async (event) => {
  // Database connection check
  await dbConnect();

  // NOTE: Session-based access control. 
  // Sadece login olmuş kullanıcılar kendi randevularını yönetebilir.
  const { user } = await getUserSession(event);

  if (!user) {
    throw createError({ 
      statusCode: 401, 
      message: "Bu işlem için oturum açmış olmanız gerekmektedir." 
    });
  }

  /**
   * NOTE: Identity-based lookup.
   * Silme işleminden önce kaydın varlığını session'daki email üzerinden verify ediyoruz.
   */
  const appointment = await Appointment.findOne({ email: user.email });
  if (!appointment) {
    console.warn(`[Appointment] Cancellation failed: No active record found for ${user.email}`);
    throw createError({
      statusCode: 404,
      message: "Sistemde iptal edilecek aktif bir randevu kaydınız bulunamadı.",
    });
  }

  const { date, time } = appointment;

  // NOTE: Persistence cleanup. Randevuyu veritabanından kalıcı olarak siliyoruz.
  await Appointment.deleteOne({ email: user.email });

  /**
   * NOTE: Real-time UI Synchronization (Event-Driven)
   * Randevu iptal edildiğinde, ilgili slotun diğer client'larda anlık olarak 
   * 'boşa çıkması' (available) için socket üzerinden broadcast yapıyoruz.
   */
  // @ts-ignore
  if (globalThis.$io) {
    // @ts-ignore
    globalThis.$io.emit("appointment-cancelled", { date, time });
  }
  
  // Audit Logging
  console.log(`🗑️ [APPOINTMENT] Record destroyed by user: ${user.email} | Slot: ${date} ${time}`);

  return { 
    success: true,
    message: "Randevunuz başarıyla iptal edilmiş ve ilgili saat kullanıma açılmıştır."
  };
});