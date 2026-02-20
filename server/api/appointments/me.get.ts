import { Appointment } from '~/server/models/Appointment'
import dbConnect from '~/server/utils/db'

/**
 * Get Current User's Appointment
 * NOTE: Kullanıcının sistemde aktif bir randevusu olup olmadığını kontrol eder.
 * Client-side tarafında 'My Appointment' badge'ini hydrate etmek için kullanılır.
 */
export default defineEventHandler(async (event) => {
  // Database connection check
  await dbConnect()

  // NOTE: Session validation. 
  // Sadece login olmuş kullanıcıların kendi datasına erişmesini garanti altına alıyoruz.
  const { user } = await getUserSession(event)
  if (!user) return null

  /**
   * NOTE: Identity-based lookup.
   * Kullanıcının session'ındaki unique email adresi üzerinden 
   * persistence layer (veritabanı) sorgusu yapılıyor.
   */
  const appointment = await Appointment.findOne({ email: user.email })
  
  // Randevu bulunamadıysa client'a boş veri dön (Handle as no-appointment state)
  if (!appointment) return null

  // NOTE: Sadece gerekli alanları (DTO) dönerek network payload'ını optimize ediyoruz.
  return { 
    date: appointment.date, 
    time: appointment.time 
  }
})