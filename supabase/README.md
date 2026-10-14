# GitHub Pages + Supabase kurulumu

Bilgisayara bir şey indirmek gerekmez. Arayüz GitHub Pages'te kalır; yalnızca kayıtları ve eşleşmeleri Supabase saklar. Supabase kullanımı zorunlu değildir: mevcut Node.js sunucusu da ayrı bir sunucuda kullanılabilir.

## 1. Projeyi oluştur

Supabase'e giriş yapıp **New project** oluştur. Veritabanı şifreni kendinde sakla; sohbet, GitHub veya arayüze yazma. Projenin hazır olmasını bekle.

## 2. Kayıt ve çekiliş tablolarını kur

Projede **SQL Editor → New query** aç. [01-setup.sql](01-setup.sql) dosyasının tamamını yapıştırıp **Run** seç. Script tekrar çalıştırıldığında kayıtları silmez.

İsimler ve eşleşmeler `office_private` şemasında tutulur. Katılımcıların tablolara erişimi yoktur. Uygulama yalnızca kontrollü fonksiyonları çağırır: kayıt, genel sayaç ve kişinin kendi sonucu. İsimle sonuç arama veya herkese açık isim listesi bulunmaz.

## 3. Organizatör hesabını oluştur

**Authentication → Users → Add user** ile kendi e-postan ve güçlü şifrenle bir kullanıcı oluştur; e-posta doğrulamasını etkinleştir veya bu hesabı doğrulanmış olarak oluştur. Kullanıcı oluşturmak tek başına yönetici yapmaz.

SQL Editor'da [02-organizer.sql](02-organizer.sql) içindeki `organizer@example.com` örneğini hesabının e-postasıyla değiştirip çalıştır. Bu e-postayı GitHub'a kaydetmen gerekmez. Bundan sonra yalnızca izin verilen hesap tarih ve bütçeyi değiştirebilir. Şifreyi sohbette paylaşma veya GitHub'a koyma. Uygulamada kendiliğinden yönetici hesabı açma seçeneği yoktur.

## 4. Otomatik çekilişi zamanla

**Database → Extensions** bölümünde `pg_cron` uzantısını etkinleştir. SQL Editor'da [03-schedule.sql](03-schedule.sql) çalıştır. Dakikada bir kapanış kontrolü yapılır. Bir katılımcı sayfaya geldiğinde de kapanmış çekiliş hemen tamamlanır; kayıtlar veritabanı saatine göre kapanır.

En az iki katılımcı gerekir. Daha az kişi varsa kayıt kapanır, çekiliş yapılamadığı bildirilir. Eşleşmeler bir kez yapılır ve saklanır. Sonuç açmak tekrar çekiliş yapmaz.

## 5. Arayüzü bağla

Projedeki **Connect** veya **Settings → API Keys** bölümünden **Project URL** ve **publishable key** bilgilerini al. Eski projelerde herkese açık `anon` anahtarı da desteklenir. `secret`, `service_role` veya veritabanı şifresi kullanma.

GitHub'da [public/config.js](../public/config.js) dosyasını düzenle:

```js
export const apiBase = '';
export const supabaseUrl = 'https://PROJE-ADRESIN.supabase.co';
export const supabasePublishableKey = 'sb_publishable_HERKESE_ACIK_ANAHTAR';
```

Bu iki değer herkese açık istemci yapılandırmasıdır; özel veriyi koruyan şey SQL'deki erişim kurallarıdır. `apiBase` boş kalır. Gerçek adres ve anahtar kaydedilene kadar Pages sürümü kayıt kabul etmez. Proje adresi ve publishable anahtarıyla canlı bağlantı kurulduktan sonra kontrol edilmeden etkinliği hazır saymayın.

## 6. Etkinliği aç ve doğrula

GitHub Pages adresindeki `public/admin.html` sayfasına gir. E-posta ve şifrenle giriş yap. Kapanış tarihini Türkiye saatiyle ve maksimum hediye bütçesini TL olarak belirle.

Önce ayrı bir Supabase deneme projesinde iki farklı tarayıcıyla kayıt ve kapanış denemesi yap. Kişisel bağlantının çalıştığını, her kişinin sadece kendi kartpostalını açtığını, anonim/başka hesabın yönetici ayarlarını değiştiremediğini ve QR'daki adresin telefondan açıldığını kontrol et. Gerçek etkinlikte farklı proje kullanarak deneme kayıtlarını karıştırma. Mevcut uygulama bitmiş etkinliği silip yeniden başlatma özelliği sunmaz.

QR, organizatörün tarayıcısında oluşturulur. Pages için tam ana ekran adresini kullan: `https://wisekina.github.io/desktop-tutorial/public/`. Ortak QR kişisel erişim anahtarı içermez. Katılımcılar Supabase hesabı açmadan yalnızca isimleriyle kaydolur. Aynı tarayıcı onları hatırlar; başka cihaz için kişisel bağlantılarını saklamalıdırlar.

## Doğrulama kapsamı

`npm test` Node.js sunucusunu ve süs/QR kurallarını doğrular. Docker bulunan geliştirme ortamında `npm run test:database`, gerçek PostgreSQL üzerinde tablo erişimini, organizatör iznini, kayıt kapanışını ve eşleşmelerin sabitliğini doğrular; fixture kullanıcıları ve kayıtları gerçek Supabase projesine yazmaz. Gerçek Supabase Auth, pg_cron ve canlı Pages bağlantısı ayrıca doğrulanmalıdır. Proje sahibi veritabanı yönetim araçlarıyla veriye erişebilir; bu yetki katılımcılara verilmez.
