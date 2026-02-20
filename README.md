# 🚀 Baran Kiriktas Reservation App Assessment

Merhaba Değerli Değerlendirme Ekibi,

Bu proje; tarafıma iletilen "Express.js + Vue.js + SQLite" tabanlı legacy randevu sisteminin, **Enterprise (Kurumsal) standartlarda**, temiz kod prensiplerine sadık kalınarak **Nuxt 3** ve **TypeScript** altyapısıyla sıfırdan yeniden yazılmış halidir.

---

## 🚀 Projeyi Çalıştırma (Kurulum Adımları)

Aşağıdaki adımları terminalinizde sırasıyla uygulayarak projeyi saniyeler içinde ayağa kaldırabilirsiniz.

### 1️⃣ Proje Dizini
Öncelikle terminalinizde projenin olduğu ana dizine giriş yapın:
```sh
cd baran-kiriktas-reservation-app-assessment

```

### 2️⃣ Bağımlılıkları Yükleyin

Proje paketlerini yüklemek için aşağıdaki komutu çalıştırın:

```sh
npm install

```

### 3️⃣ Yapılandırma (.env Ayarı)

Proje ana dizininde bulunan `.env.example` dosyasının ismini `.env` olarak değiştirin.

> **⚠️ ÖNEMLİ:** Uygulamanın çalışabilmesi için `.env` dosyası içerisindeki `MONGODB_URI` değişkenine **kendi MongoDB bağlantı adresinizi** (Lokal veya Atlas) tanımlamanız gerekmektedir.

```env
PORT=5173
# Buraya kendi MongoDB bağlantı linkinizi ekleyiniz:
MONGODB_URI=mongodb://localhost:27017/reservation-app
NUXT_SESSION_PASSWORD=en-az-32-karakterli-guclu-bir-sifre-yaziniz

```

### 4️⃣ Uygulamayı Başlatın

Uygulamayı hem frontend hem backend (Full-Stack) olacak şekilde tek bir komutla başlatın:

```sh
npm run dev

```

### 5️⃣ Tarayıcıda Açın

Uygulama hazır olduğunda aşağıdaki adresi ziyaret edin:

```
http://localhost:5173

```

---

## 🛠️ Kullanılan Teknolojiler (Tech Stack)

* **Framework:** Nuxt 3 (Vue 3 + Nitro Server Engine)
* **Dil:** **TypeScript** (End-to-end Type Safety)
* **Veritabanı:** MongoDB & Mongoose (ODM)
* **Real-Time:** Socket.io
* **Validasyon:** Zod
* **Kimlik Doğrulama:** Nuxt Auth Utils & Bcrypt
* **Stil & UI:** Tailwind CSS

---

## 🎯 Gereksinimlerin Karşılanma Durumu

Ödevde belirtilen tüm **Zorunlu** ve **Artı Değer** maddeleri bu projede eksiksiz olarak karşılanmıştır:

* **Mimari:** Nuxt 3 ve TypeScript ile monolitik, sürdürülebilir ve hata payı minimize edilmiş bir yapı.
* **Veritabanı:** MongoDB & Mongoose (Schema & Type Safety).
* **Validasyon:** Zod ile strict payload validation. E-posta domain kontrolü için **Asenkron MX Record** sorgusu.
* **Race Condition:** MongoDB **Atomic Operations** (`findOneAndUpdate`) ile eşzamanlı çakışmalar DB seviyesinde engellendi.
* **Real-Time:** Socket.io entegrasyonu ile anlık slot güncellemeleri (Sarı: İnceleniyor, Kırmızı: Dolu).
* **Güvenlik:** `bcrypt` ile şifreleme ve session tabanlı Authentication katmanı.
* **Tasarım:** Tailwind CSS tabanlı, modüler yapıda temiz UI.

---

## 🧠 Mimari Kararlar ve Çözümler

1. **Type Safety (TypeScript):** Projenin tamamı TypeScript ile kurgulanarak veri akışı sırasında oluşabilecek runtime hataları geliştirme aşamasında engellenmiştir.
2. **Eşzamanlılık (Concurrency):** Aynı anda gelen randevu taleplerinde veri tutarlılığını korumak için `$setOnInsert` atomik operatörü kullanılarak "ilk gelen kazanır" prensibi veritabanı seviyesinde uygulandı.
3. **Akıllı Kilit Sistemi:** Kullanıcı seçim aşamasındayken sekmeyi aniden kapatırsa, Socket.io `disconnect` handler'ı sayesinde kilitli kalan saatler otomatik olarak serbest bırakılır (Cleanup logic).
