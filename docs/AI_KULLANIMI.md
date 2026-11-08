# Yapay Zekâ Kullanımı

Bu belge, Fincan Arası ders projesinde yapay zekâ desteğinin nerede kullanıldığını, hangi sonuçların gerçekten doğrulandığını ve hangi kararların öğrenciye ait olduğunu şeffaf biçimde kaydeder.

## Kısa sonuç

Fincan Arası uygulamasının içinde AI API'si, sohbet botu, makine öğrenmesi veya derin öğrenme özelliği yoktur. Yapay zekâ yalnız fikir geliştirme, istem hazırlama, kodlama, hata ayıklama, test ve dokümantasyon sırasında yardımcı araç olarak kullanılmıştır. Müşteri geri bildirimleri çalışma zamanında bir model tarafından analiz edilmez veya puanlanmaz.

## Araçlar ve katkıları

| Aşama | Kullanılan araç | Alınan destek | Nasıl değerlendirildi / doğrulandı |
| --- | --- | --- | --- |
| Fikir ve kapsam | ChatGPT | Tek kafe/tek yönetici sınırı; müşteri ve yönetici akışları; kabul ölçütleri; Codex için ayrıntılı çalışma istemleri | Öğrenci hangi özelliklerin kapsamda kalacağına karar verdi; herkese açık üyelik, QR erişim kontrolü ve gereksiz servisler eklenmedi. |
| UX ve bilgi mimarisi | ChatGPT + Codex | Form sırası, yönetici listesi/detayı, durumlar, hata/boş/yüklenme/başarı görünümleri, erişilebilirlik ölçütleri | Çalışan arayüz masaüstü ve mobilde incelendi; route, odak, modal, scroll ve responsive sorunları düzeltilip tekrar gözlendi. |
| Kod ve veri mimarisi | Codex | React/Vite kaynakları, servis sözleşmesi, demo/canlı ayrımı, Supabase migration/RLS/grant/RPC, Edge Function, Auth/recovery ve Netlify dosyaları | Kod diff'i, yerel test/lint/build, uzak katalog/pgTAP/HTTP matrisi ve canlı smoke kontrolleri birlikte kullanıldı. |
| Güvenlik ve hata ayıklama | Codex | Yetki matrisi, idempotency/rate-limit, Turnstile, aktif session, gövde sınırı ve hata eşleme incelemeleri | Gerçek anonim/allowlist-dışı/admin istekleri, sınırlı eşzamanlı HTTP, gerçek CAPTCHA ve logout token kontrolü yapıldı; yalnız kod incelemesi olan maddeler ayrıca belirtildi. |
| Test | Codex | Vitest ve pgTAP senaryolarının taslağı/yazımı, komutların çalıştırılması ve sonuçların yorumlanması | Test dosyasının üretilmesi başarı sayılmadı. Son kayıtlı koşuda Vitest 42/42; uzak PostgreSQL transaction'ında pgTAP 32/32 geçti. |
| Görsel üretim | Yerleşik görsel üretim aracı | Kullanıcının Fincan Arası referansından esinlenen yazısız logo işareti ve kafe illüstrasyonu | Kullanıcı görsel yönü seçti; görseller ayrı raster varlık olarak kırpılıp optimize edildi. Marka ve slogan gerçek HTML metni kaldı; mobil/masaüstünde kontrol edildi. |
| GitHub ve Netlify | Codex + ilgili platformlar | Secret/kişisel veri kontrolü, ilk commit/push, public repo, `main` bağlantısı, build/env/origin/redirect/hostname ayarları | GitHub cihaz girişini ve Supabase/Cloudflare/Netlify panel adımlarını öğrenci yaptı. Yayımlanan commit, HTTPS, CSP/header, SPA, Turnstile ve CRUD canlıda ayrıca doğrulandı. |
| Dokümantasyon | ChatGPT + Codex | README, kurulum, proje planı, güvenlik matrisi, AI açıklaması ve ekran görüntüsü envanteri | Her iddia kanıt türüyle eşleştirildi; eski “hazır” ifadeleri doğrulanmış güncel durumla değiştirildi; erişilemeyen ekranlar çekilmiş sayılmadı. |

## Somut hata örnekleri

### 504 yerine hızlı 409 çakışması

Eşzamanlı yönetici güncellemesindeki PostgreSQL `40001` hatası gateway'de yaklaşık iki dakikalık `504` davranışına dönüşüyordu. Codex, optimistic concurrency ihlalini `PT409` / `FEEDBACK_CONFLICT` olarak eşledi. Gerçek eski `updated_at` çağrısı hızlı `409` döndürerek doğrulandı.

### Büyük gövdenin akış sırasında kesilmesi

İlk Edge Function sürümü `request.text()` ile gövdenin tamamını belleğe alıyordu. Okuyucu tabanlı 10 KiB sınırı eklendi; `content-length` olmadan gönderilen 12 KiB gerçek HTTP gövdesi `413` aldı. Birim test de akış kesme davranışını kapsıyor.

### Geçmiş aktör kısıtı

Auth kullanıcısı silinince `changed_by ON DELETE SET NULL` ile eski CHECK kısıtı çakışıyordu. Migration, `actor_kind=admin` bilgisini koruyup UUID'nin null olmasına izin verecek biçimde düzeltildi. pgTAP, kullanıcı silindikten sonra audit geçmişinin kaldığını doğruladı.

### Logout sonrası aktif session

Supabase access JWT'si imzalı olduğu için global logout sonrasında gateway tarafından doğal `exp` süresine kadar tanınabilir. Yönetici RPC yetkisi, JWT `session_id` değerini güncel `auth.sessions` satırıyla eşleştirecek şekilde sertleştirildi. Gerçek geçici yöneticiyle logout öncesi özet `200`, global logout sonrası aynı access token `403`, refresh `400` verdi.

## AI tarafından yazılan test ile çalıştırılan test ayrımı

Codex test senaryolarının çoğunu önerdi ve kaynak test dosyalarını yazdı/güncelledi. Bu tek başına “test geçti” demek değildir.

Son kayıtlı yerel koşu 9 Kasım 2026'dadır:

- **42/42 Vitest:** `demoFeedbackService` 9, Edge gönderim doğrulaması 7, auth recovery URL yardımcıları 4, Supabase servis/Auth/CAPTCHA/recovery/logout sözleşmesi 15, geçmiş aktör etiketi 3, form/yönetici doğrulaması 4 kontrol.
- ESLint sıfır uyarı/hata ve `build:live` başarılıdır.
- Bu son teslim belge ve ekran görüntüsü turunda kaynak kod değişmediği için tam test paketi yeniden çalıştırılmadı.

Uzak veritabanı toplamı ayrıdır:

- **32/32 pgTAP:** RLS, grant, anon/authenticated redleri, allowlist + aktif session, yönetici liste/detay/özet/güncelleme/silme RPC'leri, müşteri metninin değişmezliği, geçmiş ve cascade bütünlüğü.
- Transaction/temizlik kontrolü nedeniyle kurgusal test UUID'leri uzak veritabanında bırakılmadı.

Bu iki toplam birbirine eklenerek “74 test” gibi tek bir sayı olarak sunulmaz; çalışma ortamları ve kanıt türleri farklıdır.

## Gerçek geçmiş istem örnekleri

Aşağıdaki kısa alıntılar kullanıcı tarafından yazılan gerçek istemlerden gelir; yeniden düzenlenenler açıkça etiketlenmiştir:

- “Mevcut Söz Sende projesine devam et. Projeyi yeniden kurma...”
- “[Özetlenmiş istem] Önce bağlantı ve CLI durumunu kontrol et; proje referansını tahmin etme; doğru projede migration, allowlist, Auth ve Edge Function kurulumuna devam et.”
- “Legacy API keys kapatıldı” ve “Legacy JWT secret revoke edildi.”
- “Turnstile widget oluşturuldu” ve “Turnstile secret düzeltildi.”
- “[Özetlenmiş istem] Kapsamlı güvenlik denetiminde anonim, allowlist dışı ve yönetici izinlerini; public gönderim, Turnstile, rate-limit/idempotency, Auth, secret ve yayın başlıklarını doğrula.”
- “[Özetlenmiş istem] Fincan Arası referansından logo ve kafe illüstrasyonu üret; marka metnini görsele gömme.”
- “Hostname kaydedildi, canlı kontrollere devam et.”

İstemlerin ayrıntılı olması, sonuçların otomatik olarak doğru olduğu anlamına gelmedi. Kod, komut çıktısı, uzak yanıt veya görünür arayüz kanıtı olmadan madde tamamlanmış işaretlenmedi.

## Öğrenci / kullanıcı kararları ve manuel işlemler

Yapay zekâ nihai ürün sahibi değildir. Aşağıdaki karar ve işlemler kullanıcıya aittir:

- Tek kafe ve tek yönetici kapsamının kabulü
- “Fincan Arası” marka adı, referans görsel ve son görsel yön seçimi
- Supabase projesinin oluşturulması ve kesin proje referansının verilmesi
- Mevcut Auth yöneticisi/allowlist kaydının korunması
- Legacy anahtarların panelde devre dışı bırakılması
- Turnstile widget, secret ve production hostname ayarlarının panelde kaydedilmesi
- Yönetici e-posta/şifresinin yalnız tarayıcıya girilmesi; CAPTCHA'ların insan tarafından tamamlanması
- GitHub cihaz girişi, public repo ve ücretsiz Netlify yayın kararları
- Geçici test kayıtlarının oluşturulması/silinmesi ve üç `[ÖRNEK]` kaydın kalması için verilen onaylar

Kodun tamamının elle yazıldığı veya her kontrolün kullanıcı tarafından manuel yapıldığı iddia edilmez. Benzer şekilde, asistanın “çalışıyor” değerlendirmesi karşılık gelen test/komut gerçekten çalıştırılmadıysa kabul edilmez.

## Doğrulama zaman çizgisi

- **6 Kasım 2026:** Demo form/panel akışları, responsive düzen ve bellek içi CRUD test edildi; demo gizlilik metni ve geliştirme araçları ayrıldı.
- **7 Kasım 2026:** Supabase migration/RLS/RPC/Edge kodu uygulandı; uzak yetki ve pgTAP matrisi çalıştırıldı; güvenlik denetiminde gövde, concurrency, audit ve hata ayrıntıları düzeltildi.
- **8 Kasım 2026:** Gerçek Turnstile başarı/replay/expiry, aktif-session logout sertleştirmesi, Auth CAPTCHA ve recovery akışları doğrulandı; Fincan Arası marka varlıkları üretildi.
- **9 Kasım 2026:** GitHub/Netlify production yayını, HTTPS/CSP/SPA, canlı müşteri gönderimi, yönetici CRUD/yenileme ve recovery redirect kontrol edildi. Son teslim ekran envanterinde canlı müşteri/yönetici responsive görünümleri, başarı, detay/geçmiş, filtre, silme onayı ve 404 kaydedildi.

## Görsel üretim ve telif yaklaşımı

Kullanıcının yüklediği Fincan Arası referansı görsel yön olarak kullanıldı; referans ekran görüntüsü sayfaya yerleştirilmedi. Yazısız ve şeffaf logo işareti ile kafe illüstrasyonu ayrı raster varlık olarak üretildi, kırpıldı ve web boyutuna indirildi. Marka adı ile “Fikrin masada yerini alsın.” metni erişilebilir HTML olarak kaldı. Imagegen taslakları uygulama ekran görüntüsü olarak kullanılmadı; `docs/screenshots/` dosyaları çalışan arayüzden alındı.

## Gizlilik ve secret yaklaşımı

- Gerçek şifre, access/refresh token, recovery URL'si, secret/service-role anahtarı ve Turnstile secret istemlere veya belgelere konmadı.
- Frontend yalnız publishable Supabase anahtarı ve Turnstile site key gibi tasarım gereği public değerleri kullanır.
- Ekran görüntülerinde e-posta, şifre, token ve kişisel bilgi bulunmaz; yalnız kurgusal `[ÖRNEK]` veriler gösterilir.
- Başarı ekranı için oluşturulan tek `[GEÇİCİ TEST]` kayıt, kullanıcı onayıyla geçmişiyle silindi; üç sunum kaydı korundu.

## Sınırlar

- Varsayılan Supabase e-posta servisi düşük kotalı ve best-effort'tur; özel SMTP/doğrulanmış gönderici alan adı kurulmamıştır.
- Recovery'nin kayıtlı/kayıt-dışı ilk isteği nötrleştirildi; tekrarlı 60 saniye rate-limit/kota zamanlama yan kanalı açık risktir.
- Gerçek JWT'nin doğal `exp` süresi beklenerek gateway reddi ayrıca kanıtlanmamıştır; uygulama yönetici yetkisi aktif-session kontrolüyle kesilir.
- Netlify Free ve Supabase Free SLA vermez; iki ay kesintisiz erişilebilirlik garanti değildir.
- Bu son turda nötr recovery sonuç ekranı ve geçerli yeni-şifre formu yeni e-posta/CAPTCHA tüketmemek için yeniden çekilmedi. Önceki işlev kanıtı vardır fakat yeni ekran görüntüsü varmış gibi gösterilmez.
- Gerçek ekran okuyucu denemesi ve tüm akışın yalnız klavyeyle baştan sona manuel tekrarı ayrıca beklemektedir.

Teknik kanıtların ayrıntısı [GUVENLIK_KONTROL.md](./GUVENLIK_KONTROL.md), kurulum adımları [SUPABASE_KURULUM.md](./SUPABASE_KURULUM.md), kalan işletim işleri [PROJE_PLANI.md](./PROJE_PLANI.md) içindedir.
