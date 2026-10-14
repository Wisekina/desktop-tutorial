# 🎄 Neşeli Ofis

Türkçe ve Japonca arayüzlü ofis yılbaşı çekilişi. Katılımcılar kaydoldukça ağaca bir süs eklenir. Kayıt süresi bittiğinde kimsenin kendisini çekmediği rastgele bir eşleştirme yapılır. Her katılımcı kendi yılbaşı kartpostalına tıklayıp hediye alacağı kişinin adını görür.

## GitHub Pages'de arayüz

[Yılbaşı ekranını aç](https://wisekina.github.io/desktop-tutorial/public/). GitHub Pages ayarı `main` dalı ve kök dizin (`/`) olduğunda ana adres de otomatik olarak bu ekrana yönlenir. Pages yalnızca arayüz önizlemesidir; sunucu çalıştıramadığı için ortak kayıt ve gerçek çekiliş bu yayında kapalıdır. Önizleme veri kaydetmez ve kayıt başarılı gibi davranmaz. Gerçek etkinlik için ayrı backend/veritabanı bağlantısı tamamlanmalıdır.

## Bilgisayarına indirmeden tam uygulamayı dene

1. GitHub'da **Code → Codespaces → Create codespace on main** seç. GitHub hesabında Codespaces erişimi ve kullanım kotası gerekir.
2. Ortam açıldığında bağımlılıklar otomatik kurulur. Terminalde `npm start` çalıştır.
3. **Ports** sekmesindeki **3000** portu için **Open in Browser** seç.
4. Uygulamadaki **Organizatör köşesi** ekranını aç. Explorer'da `.data/admin-key` dosyasındaki anahtarı yönetim alanına gir; kapanışı birkaç dakika sonrasına ve bütçeyi istediğin tutara ayarla.
5. İlk kişinin adını kaydet. İkinci kişiyi ayrı bir tarayıcı veya gizli pencereyle kaydet. En az iki kişi gerekir. Kapanışta kişisel kartpostallar görünür.

Yönetim anahtarını ve kişisel erişim bağlantılarını başkalarıyla paylaşma. Varsayılan Codespaces bağlantısı özel olabilir; ikinci tarayıcıda GitHub hesabınla oturum açman gerekebilir. Codespaces uykuya girebildiğinden gerçek etkinlik için sürekli çalışan bir sunucu gerekir. GitHub deposu tek başına çalışan bir web sitesi değildir.

## QR ile katılım

Organizatör ekranından uygulamanın gerçek HTTPS ana adresi için ortak QR kodu oluşturup PNG olarak indirebilirsin. QR, dil seçimi ve kayıt ekranını açar; kişisel sonuçları içermez. Ofiste paylaşmadan önce yayın adresinin telefondan erişilebilir olduğunu doğrula. Codespaces portunu paylaşacaksan hesabının izinleri çerçevesinde portun görünürlüğünü ayrıca ayarlaman gerekir.

## Yerel geliştirme

Node.js 24 veya üstü gerekir.

```sh
npm ci
npm start
```

```sh
npm test
```

Veriler ve yönetim anahtarı `.data` klasöründe saklanır; Git'e yüklenmez. Gerçek kullanımda HTTPS ve kalıcı disk gerekir. Ayrıntılar: [APP.md](APP.md).
