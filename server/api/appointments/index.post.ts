import { Appointment } from "~/server/models/Appointment";
import dbConnect from "~/server/utils/db";
import { appointmentBodySchema } from "~/server/utils/validation";
import { z } from "zod";

/**
 * Create Appointment Handler
 * Kullanıcının seçtiği slotu rezerve eder, çakışmaları (race condition) engeller
 * ve tüm sisteme real-time duyuru (broadcast) yapar.
 */
export default defineEventHandler(async (event) => {
  // Persistence layer (DB) bağlantısını check et
  await dbConnect();

  /**
   * NOTE: Session & Auth Guard
   * Request atan kullanıcının identity bilgisini session'dan çekiyoruz.
   */
  const { user } = await getUserSession(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Randevu oluşturmak için oturum açmış olmanız gerekmektedir.",
    });
  }

  // Request body (payload) extract ediliyor
  const body = await readBody(event);

  let date, time;
  try {
    /**
     * NOTE: Schema Validation (Zod)
     * Payload'ı iş mantığına sokmadan önce tarih/saat formatını strict olarak validate ediyoruz.
     */
    const validatedData = appointmentBodySchema.parse(body);
    date = validatedData.date;
    time = validatedData.time;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: error.issues[0]?.message ?? "Gönderilen randevu bilgileri geçersiz formatta.",
      });
    }
    throw error;
  }

  /**
   * NOTE: Business Rule - Active Appointment Check
   * Kullanıcının sistemde halihazırda 'pending' veya aktif bir kaydı var mı check ediliyor.
   * Multi-booking denemelerini persistence seviyesine inmeden blockluyoruz.
   */
  const existingAppointment = await Appointment.findOne({ email: user.email });
  if (existingAppointment) {
    console.warn(`[Appointment] Duplicate booking attempt blocked: ${user.email}`);
    throw createError({
      statusCode: 400,
      message: "Sistemde kayıtlı aktif bir randevunuz bulunmaktadır. İkinci bir rezervasyon oluşturamazsınız.",
    });
  }

  let slotDoc;
  try {
    /**
     * CRITICAL: Atomic Operation (Race Condition Handling)
     * Aynı milisaniyede gelen isteklere karşı 'upsert' yeteneği ile atomik bir işlem başlatıyoruz.
     * Bu sayede veritabanı seviyesinde slotun tek bir kullanıcıya rezerve edildiği garanti edilir.
     */
    slotDoc = await Appointment.findOneAndUpdate(
      { date, time }, // Query criteria
      {
        $setOnInsert: {
          name: user.name,
          email: user.email,
          date,
          time,
          status: "pending",
        },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (err: any) {
    /**
     * NOTE: DB Level Unique Constraint Fallback
     * Uygulama katmanını bypass eden eşzamanlı çakışmalarda (Mongo Error 11000), 
     * kullanıcıya bilgilendirme yapıyoruz.
     */
    if (err.code === 11000) {
      console.warn(`[Conflict] Database level race condition hit for slot: ${date} ${time}`);
      throw createError({
        statusCode: 409,
        message: "Seçtiğiniz saat dilimi saniyeler önce başka bir kullanıcı tarafından rezerve edildi.",
      });
    }
    throw err;
  }

  /**
   * NOTE: Ownership Verification
   * Upsert başarılı olsa bile, dönen dökümanın sahibi biz değilsek yarışı (race) kaybetmişiz demektir.
   */
  if (slotDoc.email !== user.email) {
    throw createError({
      statusCode: 409,
      message: "Üzgünüz, bu randevu saati az önce doldu. Lütfen başka bir zaman dilimi seçiniz.",
    });
  }

  /**
   * NOTE: Multi-tab & Security Enforcement
   * Eğer kullanıcı birden fazla sekme kullanarak saniyeler içinde birden fazla kayıt oluşturmayı başardıysa,
   * son oluşturulan kaydı revert (delete) ediyoruz.
   */
  const userAppts = await Appointment.find({ email: user.email });
  if (userAppts.length > 1) {
    await Appointment.deleteOne({ _id: slotDoc._id });
    console.error(`[Security] Potential multi-request bypass detected for ${user.email}`);
    throw createError({
      statusCode: 400,
      message: "Geçersiz işlem: Çoklu randevu talebi güvenlik protokolü gereği reddedildi.",
    });
  }

  // Success audit log
  console.log(`✅ [Appointment] Slot persisted: ${user.email} -> ${date} ${time}`);

  /**
   * NOTE: Real-time UI Sync (Socket.io)
   * Randevu başarıyla oluşturulduğu an, tüm client'lara broadcast yaparak 
   * grid üzerindeki ilgili slotun anında 'booked' (kırmızı) olmasını sağlıyoruz.
   */
  // @ts-ignore
  if (globalThis.$io) {
    // Hard-lock: Grid üzerindeki butonu devre dışı bırak
    // @ts-ignore
    globalThis.$io.emit("appointment-booked", { date, time });
    
    // Cleanup: Slot üzerindeki 'inceleme' (sarı) kilitlerini temizle
    // @ts-ignore
    globalThis.$io.emit("time-cleared", { date, time });
  }

  return {
    success: true,
    appointment: slotDoc,
    message: "Randevunuz başarıyla onaylanmıştır. Takviminize eklemeyi unutmayın!",
  };
});