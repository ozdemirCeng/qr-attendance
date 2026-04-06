Case Çalışması: QR Kod ile Yoklama & Katılım Sistemi
Amaç
Bu case çalışmasının amacı, adayın:Frontend, backend ve veritabanı entegrasyonunu uçtan
uca kurgulama becerisini, ölçeklenebilir bir sistem mimarisi kurabilme yaklaşımını
değerlendirmektir.
Problem Tanımı
Bir etkinlik, ders veya konferans ortamında katılımcı yoklamasının QR kod üzerinden hızlı ve
güvenli şekilde alınabilmesini sağlayan bir sistem geliştirilmesi beklenmektedir. Uygulama,
hem kayıtlı kullanıcılar hem de sistemde önceden bulunmayan katılımcılar için yoklama
alabilecek şekilde tasarlanmalıdır.
Kullanılacak Teknolojiler
● Frontend React ile geliştirilmelidir (tercihen Next.js).
● Backend Node.js tabanlı olmalıdır (Next.js API veya NestJS tercih edilebilir).
● Veritabanı olarak Neon kullanılmalıdır.
● Uygulama Vercel üzerinde deploy edilmelidir.

Beklenen Çalışma Kapsamı
1. Yönetici (Admin) Arayüzü
● Yönetici için bir giriş mekanizması bulunmalıdır. Yeni bir etkinlik/oturum
oluşturulabilmelidir. Oluşturulan her etkinlik için QR kod üretilmelidir.
● Üretilen QR kod: Belirli bir zaman aralığında (ör. her 1 dakikada bir) otomatik olarak
değişmelidir. Sürekli aynı QR kod kullanılmamalıdır.
● Kayıtlı katılımcı listesi sisteme aktarılabilmelidir (CSV ve manuel).
● Kayıtlı katılımcılar listelenmeli ve her katılımcı için: Var / Yok işaretlemesi
yapılabilmelidir.
● Etkinliğe ait katılım kayıtları görüntülenebilmelidir: Katılımcı bilgisi, Katılım tarihi ve
saati. Etkinlik bazlı katılım listesi Excel formatında dışa aktarılabilmelidir.
2. Katılımcı (QR Okutma) Akışı
● Mobil cihazlardan kamera kullanılarak QR okutma yapılabilmelidir.
● QR okutulduğunda sistem: İlgili etkinliği doğrulamalıdır. QR kodun geçerli zaman
aralığında olup olmadığını kontrol etmelidir.
● Sistemde kayıtlı olan katılımcılar için: Katılım otomatik olarak kaydedilmelidir.
● Sistemde kayıtlı olmayan katılımcılar için: Ad,soyad ve iletişim bilgisi zorunlu olacak
şekilde bir form gösterilmelidir. Form doldurulduktan sonra katılım kaydı

oluşturulmalıdır.

3. Konum (Lokasyon) Doğrulaması
● QR okutma sırasında katılımcının konum bilgisi (GPS) alınmalıdır.
● Katılım kaydı: Etkinlik için tanımlanan konum ile makul bir mesafe içerisindeyse
geçerli sayılmalıdır. Konum bilgisi alınamıyorsa veya etkinlik konumundan çok
uzaksa:Katılım kaydı engellenmeli ve kullanıcı uyarılmalıdır. Konum doğrulaması
temel seviyede yeterlidir (yüksek hassasiyet beklenmemektedir).
Arayüz ve Tasarım Beklentileri: Tüm arayüzler mobil uyumlu olmalıdır. ChatGPT, Cursor
veya benzeri araçlardan doğrudan kopyalanmış hazır arayüzler kullanılmamalıdır.
Profesyonel görünmelidir. Tüm arayüzler mobil uyumlu olmalıdır.
Temel hata senaryoları ele alınmalıdır: Geçersiz veya süresi dolmuş QR kod, Etkinlik
bulunamaması, Yetkisiz erişim, Konum doğrulamasının başarısız olması vb.
Sunum
Aday, yaptığı çalışmayı: Maksimum 10 dakikalık bir sunum ile anlatmalıdır. Sunumda mimari
kararlar, QR yenileme yaklaşımı ve konum doğrulama mantığı açıklanmalıdır.

Teslim Edilmesi Beklenenler
● Kaynak kod (GitHub / GitLab / zip)
● Kısa teknik açıklama (README yeterlidir)
● Sunum dosyası (PDF veya PPT)