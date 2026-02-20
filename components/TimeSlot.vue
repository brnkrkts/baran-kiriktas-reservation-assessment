<script setup lang="ts">
import { io } from "socket.io-client";

const { loggedIn, user, clear } = useUserSession()

// Form ve availability state'leri
const form = ref({ date: '', time: '' })
const availableTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']

// UI senkronizasyonu için data array'leri
const bookedTimes = ref<string[]>([])
const lockedTimes = ref<string[]>([])
const myAppointment = ref<{date: string, time: string} | null>(null)

let socket: any = null;

// --- Custom Toast Notification ---
// Third-party library kullanmak yerine bundle size'ı ufak tutmak için custom handle ediyoruz.
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3500) // Auto-dismiss
}

// --- Custom Confirm Modal ---
// Native confirm() blocklayıcı olduğu için custom UI ile replace edildi.
const confirmDialog = ref({ show: false, message: '', onConfirm: () => {} })
const requireConfirm = (message: string, onConfirm: () => void) => {
  confirmDialog.value = { show: true, message, onConfirm }
}
const handleConfirm = () => {
  confirmDialog.value.onConfirm()
  confirmDialog.value.show = false
}
const closeConfirm = () => {
  confirmDialog.value.show = false
}

onMounted(async () => {
  // Socket connection initialize ediliyor
  socket = io(); 

  // Kullanıcının aktif appointment'ı varsa fetch et
  if (loggedIn.value) {
    try {
      const res: any = await $fetch('/api/appointments/me')
      if (res) myAppointment.value = { date: res.date, time: res.time }
    } catch (err) {
      // API fail olursa silent fail, default state null kalır
    }
  }

  // --- Socket Listeners (Real-time Grid Updates) ---
  socket.on("appointment-booked", (data: { date: string, time: string }) => {
    // Gelen data current view ile match ediyorsa hard-lock (Kırmızı) atıyoruz
    if (form.value.date === data.date && !bookedTimes.value.includes(data.time)) {
      bookedTimes.value.push(data.time);
    }
  });

  socket.on("time-selected", (data: { date: string, time: string }) => {
    // Başka client select ettiyse soft-lock (Sarı) at
    if (form.value.date === data.date && !lockedTimes.value.includes(data.time)) {
      lockedTimes.value.push(data.time);
    }
  });

  socket.on("time-cleared", (data: { date: string, time: string }) => {
    // Client select'i bırakırsa veya disconnect olursa soft-lock'ı release et
    if (form.value.date === data.date) {
      lockedTimes.value = lockedTimes.value.filter(t => t !== data.time);
    }
  });

  socket.on("appointment-cancelled", (data: { date: string, time: string }) => {
    // Başkası appointment'ı iptal ederse slotu tekrar availeble yap
    if (form.value.date === data.date) {
      bookedTimes.value = bookedTimes.value.filter(t => t !== data.time);
    }
  });
})

onUnmounted(() => {
  // Component unmount olduğunda gracefull disconnect ve release locks
  if (socket) {
    if (form.value.time) {
      socket.emit("time-cleared", { date: form.value.date, time: form.value.time });
    }
    socket.disconnect();
  }
})

// Date picker değiştiğinde tetiklenir
watch(() => form.value.date, async (newDate, oldDate) => {
  // Eski date'deki seçimi socket üzerinden release et
  if (oldDate && form.value.time) {
    socket?.emit("time-cleared", { date: oldDate, time: form.value.time });
  }

  if (newDate) {
    // State reset
    form.value.time = '' 
    lockedTimes.value = [] 
    
    // Yeni date için doluluk datalarını fetchle
    try {
      const response: any = await $fetch(`/api/appointments?date=${newDate}`)
      bookedTimes.value = Array.isArray(response) ? response : []
    } catch (err) {
      bookedTimes.value = []
    }
  }
})

const logout = async () => {
  await clear()
  await $fetch('/api/auth/logout', { method: 'POST' })
}

const cancelAppointment = () => {
  requireConfirm('Mevcut randevunuzu iptal etmek istediğinize emin misiniz?', async () => {
    try {
      await $fetch('/api/appointments', { method: 'DELETE' as any })
      showToast('Randevunuz başarıyla iptal edilmiştir.', 'success')
      
      // State'i local olarak clear'la (Optimistic update)
      myAppointment.value = null 
      form.value.date = '' 
    } catch (err: any) {
      showToast(err.data?.message || err.message, 'error')
    }
  })
}

const selectTime = (time: string) => {
  // Slot available değilse action'ı blockla
  if (bookedTimes.value.includes(time) || lockedTimes.value.includes(time)) return;

  // Önceki slotu release et
  if (form.value.time) {
    socket?.emit("time-cleared", { date: form.value.date, time: form.value.time });
  }
  
  form.value.time = time
  // Yeni slotu diğer client'lara broadcast et
  socket?.emit("time-selected", { date: form.value.date, time: form.value.time });
}

const bookAppointment = async () => {
  // Validation: Payload eksikse early return
  if (!form.value.time) {
    showToast('İşleme devam etmeden önce lütfen bir saat seçimi yapın.', 'error')
    return
  }
  
  try {
    await $fetch('/api/appointments', {
      method: 'POST',
      body: { date: form.value.date, time: form.value.time }
    })
    
    showToast('Randevunuz başarıyla oluşturulmuştur.', 'success')
    
    // Yeni appointment'ı local state'e yaz
    myAppointment.value = { date: form.value.date, time: form.value.time }
    
    if (!bookedTimes.value.includes(form.value.time)) {
      bookedTimes.value.push(form.value.time);
    }
    form.value.time = ''
  } catch (err: any) {
    // Exception handling
    showToast(err.data?.message || err.message, 'error')
    
    // Race condition (409) veya rate limit (400) durumunda grid'i force sync yap
    if (err.statusCode === 409 || err.statusCode === 400) {
      form.value.time = ''
      const refresh: any = await $fetch(`/api/appointments?date=${form.value.date}`)
      bookedTimes.value = Array.isArray(refresh) ? refresh : []
    }
  }
}
</script>

<template>
  <div class="calendly-layout relative">
    
    <Transition name="toast">
      <div v-if="toast.show" 
           class="toast-container"
           :class="toast.type === 'success' ? 'toast-success' : 'toast-error'">
        
        <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>

        {{ toast.message }}
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmDialog.show" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-icon-wrapper">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="modal-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
             </svg>
          </div>
          <h3 class="modal-title">İşlemi Onaylıyor musunuz?</h3>
          <p class="modal-description">{{ confirmDialog.message }}</p>
          <div class="modal-actions">
            <button @click="closeConfirm" class="modal-btn-cancel">Vazgeç</button>
            <button @click="handleConfirm" class="modal-btn-confirm">İptal İşlemini Onayla</button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="!loggedIn" class="auth-wrapper">
      <AuthForm />
    </div>

    <div v-else class="calendly-container">
      <header class="calendly-header">
        <div class="header-info">
          <div class="avatar">{{ user?.name?.charAt(0).toUpperCase() || 'U' }}</div>
          <div class="user-details">
            <h2 class="user-name">{{ user?.name }} ile Görüşme</h2>
            <p class="meeting-duration">⏱ 30 Dk. Görüşme</p>
          </div>
        </div>

        <div v-if="myAppointment" class="my-appointment-badge">
           <div class="badge-info-wrapper">
             <span class="badge-label">Aktif Randevunuz</span>
             <span class="badge-datetime">{{ myAppointment.date }} | {{ myAppointment.time }}</span>
           </div>
           <button @click="cancelAppointment" class="btn-cancel">İptal Et</button>
        </div>

        <button @click="logout" class="btn-logout" title="Çıkış Yap">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-base">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </header>

      <main class="booking-grid">
        <div class="date-section">
          <h3 class="section-title">Tarih Seçimi</h3>
          <input 
            v-model="form.date" 
            type="date" 
            class="calendly-date-picker"
            required
            :min="new Date().toISOString().split('T')[0]" 
            :disabled="myAppointment !== null" 
          />
          <div v-if="myAppointment" class="warning-box">
             ⚠️ Yeni bir randevu planlayabilmek için öncelikle mevcut randevunuzu iptal etmeniz gerekmektedir.
          </div>
          <div v-else-if="!form.date" class="helper-text">
             Uygun saatleri görüntülemek için lütfen bir tarih seçin.
          </div>
        </div>

        <div class="time-section" :class="{ 'time-section-disabled': !form.date || myAppointment }">
          <h3 class="section-title">
            {{ form.date ? form.date + ' İçin Uygun Saatler' : 'Tarih Seçimi Bekleniyor' }}
          </h3>
          
          <div class="time-slots">
             <button 
                v-for="time in availableTimes" 
                :key="time"
                type="button"
                @click="selectTime(time)"
                class="time-btn"
                :disabled="bookedTimes.includes(time) || (lockedTimes.includes(time) && form.time !== time)"
                :class="{ 
                  'booked-time': bookedTimes.includes(time),
                  'locked-time': lockedTimes.includes(time) && form.time !== time,
                  'selected-time': form.time === time 
                }"
             >
                {{ bookedTimes.includes(time) ? 'Dolu' : (lockedTimes.includes(time) && form.time !== time ? 'İşlemde...' : time) }}
             </button>
          </div>
        </div>
      </main>

      <footer class="calendly-footer" v-if="form.date && form.time && !myAppointment">
         <div class="selection-summary">
           Seçiminiz: <strong>{{ form.date }}</strong> saat <strong>{{ form.time }}</strong>
         </div>
         <button @click="bookAppointment" class="btn-confirm">Randevuyu Onayla</button>
      </footer>
    </div>
  </div>
</template>

<style scoped src="~/assets/css/components/timeslot.css"></style>
<style src="~/assets/css/components/toast-modal.css"></style>