import { Appointment } from "~/server/models/Appointment";
import dbConnect from "~/server/utils/db";
import { z } from "zod";

/**
 * Query Validation Schema
 * NOTE: Gelen query parametrelerini tip güvenliği ve format uygunluğu açısından 
 * Zod ile validate ediyoruz. Yanlış formatta istek gelmesini engeller.
 */
const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih formatı (YYYY-MM-DD bekleniyor)"),
});

export default defineEventHandler(async (event) => {
  // Database connection check
  await dbConnect();

  // Extract query parameters
  const query = getQuery(event);

  try {
    // NOTE: Request validation. Payload şemaya uymuyorsa catch bloğuna düşer.
    const { date } = querySchema.parse(query);

    /**
     * NOTE: Data Fetching & Performance Optimization
     * .select("time -_id") -> Sadece 'time' alanını alarak network payload'ını düşürüyoruz.
     * .lean() -> Mongoose'un ağır 'document' objesi yerine düz JS objesi dönmesini sağlayarak
     * memory tüketimini ve CPU yükünü minimize ediyoruz.
     */
    const appointments = await Appointment
      .find({ date })           
      .select("time -_id")
      .lean<{ time: string }[]>();

    // NOTE: DTO Mapping. Frontend'in beklediği düz dizi (string[]) formatına map ediyoruz.
    return appointments.map((app) => app.time);

  } catch (error) {
    // NOTE: Hatalı sorgu veya validasyon hatası durumunda grid'in bozulmaması için 
    // boş dizi (empty fallback) dönüyoruz.
    return [];
  }
});