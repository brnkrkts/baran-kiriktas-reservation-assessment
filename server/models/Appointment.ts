import mongoose, { Document } from 'mongoose'

/**
 * Appointment Entity Interface
 * Data Transfer Object (DTO) seviyesinde tip güvenliği sağlar ve 
 * Mongoose query sonuçlarını güçlü bir şekilde tiplememize (strongly typed) olanak tanır.
 */
export interface IAppointment extends Document {
  name: string;
  email: string;
  date: string;
  time: string;
  status: string;
}

/**
 * Appointment Schema Definition
 * Randevu kayıtlarının veritabanı şemasını ve kısıtlamalarını (constraints) tanımlar.
 */
const AppointmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Müşteri ismi zorunludur.'] 
  },
  email: { 
    type: String, 
    required: [true, 'E-posta adresi zorunludur.'],
    lowercase: true, // Data consistency için e-postalar küçük harf saklanır.
    trim: true 
  },
  date: { 
    type: String, 
    required: [true, 'Randevu tarihi belirtilmelidir.'] 
  },
  time: { 
    type: String, 
    required: [true, 'Randevu saati seçilmelidir.'] 
  },
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'completed', 'cancelled'] // Pre-defined status list
  },
}, { 
  timestamps: true // createdAt ve updatedAt alanlarını otomatik yönetir.
})

/**
 * NOTE: Concurrency Handling (Compound Unique Index)
 * Uygulama seviyesindeki race condition kontrollerine ek olarak, 
 * veritabanı seviyesinde (database-level constraint) aynı tarih ve saate 
 * sadece tek bir randevu girilebilmesini donanımsal olarak garanti altına alır.
 */
AppointmentSchema.index({ date: 1, time: 1 }, { unique: true })

/**
 * Appointment Model Initialization
 * Nitro'nun HMR (Hot Module Replacement) sırasında modeli tekrar tanımlamaya 
 * çalışıp hata vermesini engellemek için singleton kontrolü yapıyoruz.
 */
export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema)