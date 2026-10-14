# Neşeli Ofis — yılbaşı çekilişi

Node.js 24 veya üstü ile `npm start` çalıştırın. İlk kurulumda `npm ci` ile QR üretim paketini kurun. Derleme veya harici veritabanı servisi gerekmez. Varsayılan port 3000; `PORT` ve `HOST` ile değiştirilebilir. `npm test`, kayıt kapanışını, özel sonuçları, eşleştirmeyi ve sunucu yeniden başlatıldığında kalıcılığı doğrular.

## Organizatör

`/yonetim` ekranında tarih/saat (Türkiye saati) ve TL cinsinden hediye üst limiti ayarlanır. İlk açılışta oluşturulan yönetim anahtarı `.data/admin-key` dosyasındadır. Dosyayı yalnızca organizatör okumalıdır; katılımcılarla paylaşmayın. Alternatif olarak sunucuya `ADMIN_KEY` ortam değişkeni verilebilir. Tarih ve bütçe belirlenene kadar kayıt kapalıdır. Kapanıştan önce ayarlar değiştirilebilir; katılımcılara değişiklikleri ayrıca duyurun.

İlk açılışta Türkçe veya Japonca seçilir; dil seçimi hatırlanır ve üst menüden değiştirilebilir. Tarihler iki dilde de Türkiye saatine göre gösterilir. Her kayıtta bir ağaç süsü eklenir. Diğer ekranlar on saniyede güncellenir. Sunucu kapanış anında eşleştirmeyi başlatır: herkes başka bir kişiyi çeker ve her kişi bir kez çekilir. Sonuçlar bir kez üretilip SQLite dosyasına kaydedilir. Sunucu o anda kapalıysa tekrar başladığında çekiliş yapılır. En az iki kişi gerekir; daha az kişide kayıt kapanır, çekiliş yapılamadığı bildirilir.

## Katılımcı

Adını kaydeder ve aynı tarayıcıdan geri gelir. Tarayıcıdaki özel erişim anahtarı onu tanır. Tarih geldiğinde kendi yılbaşı kartpostalına tıklayıp hediye alacağı kişinin adını görür. Başka cihaz için kayıt ekranındaki “erişimimi sakla” alanından özel bağlantısını kopyalayabilir. Bağlantı URL fragmentinde kalır; erişim anahtarı sunucuda hash olarak saklanır. İsimle sonuç arama veya herkese açık katılımcı listesi yoktur. Aynı tarayıcı profili bir katılımcı içindir; ortak cihazlarda ayrı tarayıcı profilleri kullanın. Tarayıcı verisi ve yedek bağlantı birlikte kaybolursa otomatik erişim kurtarma yoktur.

## Yayına alma

Bu sürüm yerelde çalışan ilk sürümdür. Ofisle paylaşmak için Node.js 24 destekli, HTTPS sağlayan bir sunucu ve `.data` için kalıcı disk gerekir. Veriler `.data/draw.sqlite` içinde saklanır; `.data` dizinini yedekleyin ve Git'e eklemeyin. Disk olmadan geçici/sunucusuz barındırmada kayıtlar kaybolur. Süreklilik için sunucuyu bir süreç yöneticisiyle çalıştırın.

Kişisel bağlantıyı bilen herkes o sonucu açabilir. Organizatör ekranı sonuçları listelemez, ancak sunucu/veritabanı yöneticisi teknik olarak veriye erişebilir. İsimle kayıt kimlik doğrulaması değildir: ilk sürümde aynı isimle tekrar kayıt engellenir, fakat farklı isimlerle kayıt mümkündür. Gerçek ofis etkinliğinde şirket e-postası doğrulaması veya kişiye özel tek kullanımlık davet kodu eklenmesi önerilir. Paylaşılacak canlı adres ve dağıtım bu sürümde henüz oluşturulmadı.

## QR ile katılım

`/yonetim` ekranındaki QR bölümüne uygulamanın gerçek HTTPS yayın adresini girin. Ortak QR kodu oluşturulabilir ve PNG olarak indirilebilir; ofis panosuna asılabilir veya ekip içinde paylaşılabilir. Telefonda tarandığında dil seçimi ve kayıt ekranı açılır. Kod sunucuda üretilir; üçüncü taraf QR hizmeti kullanılmaz. QR'ı paylaşmadan önce adresi telefonunuzdan açıp ulaşılabildiğini kontrol edin. Henüz bir yayın adresi oluşturulmadı. Yerel adresler ve kişisel kartpostal bağlantıları ortak QR olarak kabul edilmez. Ortak QR çekiliş sonrasında da siteyi açar; katılımcı kendi kartpostalına erişmek için kayıt yaptığı tarayıcıyı veya yedek erişim bağlantısını kullanmalıdır.

## Tasarım önizlemesi

Katılımcıya gönderilen normal bağlantıda kartpostal önizlemesi yoktur. Tasarımı incelemek için ana ekran adresine `?preview=1#kartpostal` ekleyin. Bu yalnızca örnek tasarımı açar; bir yetkilendirme yöntemi değildir ve hiçbir kişisel eşleşmeyi göstermez. Kayıt kapanışında geri gelme hatırlatması ekranda gösterilir; e-posta veya telefon bildirimi gönderilmez.

Normal katılımcı ekranında organizatör bağlantısı gizlidir; tasarım inceleme modunda görünür. Bu görsel ayrım yetkilendirme değildir: `admin.html` statik bir ekran olarak doğrudan açılabilir. Çalışan Node.js sunucusunda ayar değişikliği özel yönetim anahtarıyla korunur; GitHub Pages önizlemesinde tüm yönetim işlemleri kapalıdır.
