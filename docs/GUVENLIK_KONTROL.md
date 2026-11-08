# Fincan Arası güvenlik kontrolü

> Denetim tarihi: 7–8 Kasım 2026
> Uzak hedef: yalnız `ckanefuhclkcvlzfmiax`
> Kapsam: mevcut React/Vite istemcisi, Supabase Auth/PostgreSQL/Edge Function, migration'lar, testler, build çıktısı ve belgeler

Bu belge önceki sonuçları kanıt kabul etmeden yapılan teslim öncesi denetimin kaydıdır. Gizli anahtar, parola, erişim/kurtarma tokenı, ham IP veya gerçek kullanıcı verisi içermez.

Durumların anlamı:

- **doğrulandı:** Kod incelemesi ile birlikte uygun yerlerde gerçek uzak istek veya otomatik test kanıtı var.
- **eksik ve düzeltildi:** Denetimde somut eksik bulundu, mevcut kapsam içinde düzeltildi ve yeniden test edildi.
- **engellendi:** Güvenli biçimde tamamlamak için dış koşul veya insan etkileşimi gerekiyor.
- **yayın sonrası bekliyor:** Frontend henüz yayınlanmadığı için canlı origin/hostname/header gibi sonuç doğrulanamıyor.
- **gerekçesiyle uygulanamaz:** Mevcut mimari veya olmayan veri nedeniyle kontrolün belirtilen biçimi uygulanamıyor; gerekçe ve risk yazılıdır.

## 1. Yetkilendirme

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Anonim tablo ve RPC erişimi | doğrulandı | Gerçek HTTP matrisinde feedback için select/insert/update/delete, geçmiş, liste, bilinen-ID detay, özet, güncelleme, silme ve service-only RPC çağrıları 401/SQLSTATE 42501 ile reddedildi. | Supabase gateway/grant davranışı değişirse test yeniden çalıştırılmalı. |
| Gerçek allowlist dışı Auth kullanıcısı | doğrulandı | Geçici gerçek Auth kullanıcısı ile aynı tablo/RPC matrisi 403; `is_current_user_admin=false`; bilinen kayıt ID'si ayrıntı vermedi. | Kullanıcı başka bir güvenilir yönetici tarafından allowlist'e alınırsa yetki kazanır; bu işletimsel süreç ayrıca korunmalı. |
| Allowlist yöneticisi | doğrulandı | Geçici kullanıcı yalnız server-side allowlist satırından sonra liste, detay+geçmiş, özet, durum/not güncelleme ve silme RPC'lerini çağırabildi. Doğrudan tablo CRUD yine reddedildi. | Yönetici hesabının ele geçirilmesi tüm yönetici RPC kapsamını açar; MFA kaydı bu denetimde zorunlu tutulmadı. |
| Allowlist'in istemciden değiştirilmesi | doğrulandı | `private` şeması Data API'de açık değil; anon, sıradan kullanıcı ve yönetici REST çağrıları allowlist ekleyemedi. Tablo grant sorguları ve pgTAP bunu doğruladı. | Supabase Dashboard/DB yetkisi olan proje sahibinin ayrıcalığı uygulama dışı güven sınırıdır. |
| Yetkinin yalnız arayüzde kalmaması | doğrulandı | RLS açık, tablo grant'leri kapalı, her yönetici `SECURITY DEFINER` RPC'si `private.require_admin()` çağırıyor; route guard yalnız ek istemci katmanı. | RLS tek başına değil grant+RPC modeliyle birlikte korunmalı. |

## 2. Veritabanı

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Grant, RLS ve function EXECUTE matrisi | doğrulandı | Uzak katalog sorguları, aktif Auth session kontrolünü de kapsayan 32/32 transaction içi pgTAP ve 46 maddelik gerçek HTTP matrisi geçti. Anon/authenticated doğrudan tablo yetkileri yok; service RPC'leri yalnız `service_role`; yönetici RPC'leri authenticated + içeride allowlist/session kontrolü. | Yeni tablo/işlev eklenirse default privilege ve test matrisi genişletilmeli. |
| `SECURITY DEFINER` güvenliği | doğrulandı | Tüm ayrıcalıklı işlevlerde boş `search_path`; tablo/işlev adları şema nitelikli; yönetici ve service-role kontrolleri işlev içinde. Son uzak `db lint` sonucu hatasız. | İşlev sahipliği yüksek ayrıcalıktır; yeni dinamik SQL eklenmemeli. |
| Yeni secret anahtarlı ayrıcalıklı yol | doğrulandı | Edge Function secret'ı yalnız server ortamından okuyor; frontend/build içinde secret/service-role değeri yok. Service RPC'leri anon/authenticated için gerçek isteklerde reddedildi. | Server secret ele geçirilirse service-role kapsamı çok geniştir; Dashboard erişimi ve secret rotasyonu işletimsel risktir. |
| Kısıtlar ve transaction tutarlılığı | doğrulandı | Enum/check/uzunluk/FK kısıtları mevcut; durum+not+geçmiş aynı RPC transaction'ında; aynı durum ikinci geçmiş satırı üretmedi. | Doğrudan service-role SQL kullanımı uygulama kısıtlarını aşabilir; bu anahtar istemciye taşınmamalı. |
| Feedback silme ve geçmiş cascade'i | doğrulandı | Gerçek yönetici silmesinden sonra feedback ve bağlı geçmiş sayıları ayrı ayrı sıfırlandı; pgTAP da `ON DELETE CASCADE` davranışını geçti. | Silme geri alınamaz; yayın öncesi yedek/kurtarma prosedürü gerekli. |
| Auth kullanıcısı silinince geçmiş tutarlılığı | eksik ve düzeltildi | `changed_by ON DELETE SET NULL` ile eski CHECK çakışıyordu. `20261107090000_harden_feedback_integrity.sql` aktör türünü koruyup nullable kimliğe izin verdi; pgTAP ile kullanıcı silme sonrası geçmiş korundu. | Silinen yöneticinin UUID'si artık tutulmaz; yalnız `actor_kind=admin` kalır. |
| Eşzamanlı yönetici güncellemesi | eksik ve düzeltildi | `40001` hatası gateway'de yaklaşık iki dakikalık 504'e dönüşüyordu. Hata `PT409` yapıldı; gerçek stale `updated_at` çağrısı hızlı `409/FEEDBACK_CONFLICT` döndürdü. | İstemci 409 sonrası güncel kaydı yeniden yükleyip kullanıcı kararını istemeye devam etmeli. |

## 3. Public gönderim

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Yöntem, origin ve content-type | doğrulandı | Uzak Edge testinde yanlış origin 403, originsiz istek 403, GET 405, `text/plain` 415; izinli origin CORS başlığıyla çalıştı. | CORS kimlik doğrulama değildir; doğrudan HTTP istemcileri diğer kontrollerden geçmek zorundadır. |
| Bozuk JSON, beklenmeyen/yönetici alanları | doğrulandı | Bozuk JSON 400; bilinmeyen üst alan ile `status/admin_note` enjeksiyonu 422. Yalnız dört feedback alanı kabul ediliyor. | Yeni alan eklendiğinde hem istemci hem sunucu whitelist'i birlikte güncellenmeli. |
| Enum, uzunluk ve yalnız-boşluk içeriği | doğrulandı | Uzak istekler ve birim testleri type/category enum'larını, 5–100/10–2000 trimlenmiş metin sınırlarını, UUID ve 2048 byte token sınırını doğruladı. Veritabanı CHECK'leri ikinci katman. | Unicode görsel benzerlikleri ve içerik moderasyonu ürün politikasıdır; güvenlik doğrulaması bunları sınıflandırmaz. |
| Gerçek gövde boyutu | eksik ve düzeltildi | Önce `request.text()` tüm gövdeyi belleğe alıyordu. Akış okuyucu 10 KiB aşımında isteği iptal ediyor; content-length olmadan gönderilen 12 KiB gerçek HTTP isteği 413 aldı. | Platformun Edge katmanındaki daha üst kaynak limitleri ayrıca Supabase tarafından yönetilir. |
| Kullanıcı metninin gösterimi ve sorguya aktarımı | doğrulandı | Kod taramasında `dangerouslySetInnerHTML`, `innerHTML`, `eval` veya dinamik SQL yok. React metin düğümleri escape ediyor; arama RPC parametresi PL/pgSQL ifadesine veri olarak giriyor. CSP'de `object-src 'none'` ve script allowlist'i eklendi. | Üçüncü taraf bağımlılıkta istemci XSS açığı çıkarsa CSP ek savunmadır; canlı header henüz yayın sonrası doğrulanmadı. |
| Public hata yanıtları | eksik ve düzeltildi | Turnstile secret/action/hostname ayrıntıları ve configuration durumu istemciye özel kodlarla dönüyordu. İstemci artık yalnız genel `VERIFICATION_FAILED`/`SUBMISSION_UNAVAILABLE` alıyor; log yalnız request ID + sabit sınıflandırma içeriyor. Gerçek istek yanıtlarında SQL, stack, token, iç not veya kayıt gövdesi yok. | Supabase REST'in standart SQLSTATE/table adı hataları ayrı gateway davranışıdır; veri değeri açığa çıkmadı. |

## 4. Turnstile

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Eksik ve geçersiz token | doğrulandı | Eksik token sunucu doğrulamasında 422; geçersiz token gerçek Siteverify çağrısından sonra genel 400 `VERIFICATION_FAILED`. Güvenlik kontrolü test için kapatılmadı. | Çok sayıda geçersiz deneme rate-limit kotasını tüketir; bu beklenen korumadır. |
| Action ve hostname doğrulaması | doğrulandı | Widget gerçek tokenı `feedback_submit` action'ıyla üretti; son uzak Edge sürümü bu tokenı ancak action ve yerel hostname exact allowlist kontrolünden sonra kabul edip kaydı oluşturdu. Yanlış action/hostname birim testlerinde reddedildi. | Production hostname'i yayın sırasında Dashboard widget ve Edge allowlist'ine eklenmeli; yerel hostların canlıda kalıp kalmayacağı bilinçli seçilmeli. |
| Sağlayıcı hata verdiğinde fail-closed | doğrulandı | Siteverify HTTP başarısızlığı `isTurnstileResultValid=false`; timeout/parse/network hatası genel 503 yoluna düşüyor. Token veya provider gövdesi loglanmıyor. | Gerçek Cloudflare kesintisi kasten üretilmedi; davranış kod+birim testiyle doğrulandı. |
| Süresi dolmuş ve tekrar kullanılmış gerçek token | doğrulandı | Managed widget'ın gerçek tokenı ilk gönderimde kabul edildi; aynı token yeni istek anahtarıyla tekrar kullanıldığında genel `400/VERIFICATION_FAILED` aldı. Ayrı gerçek token, üretiminden 315 saniye sonra aynı genel 400 ile reddedildi ve kayıt oluşturmadı. | Cloudflare tokenları 300 saniye ve tek kullanım sınırına tabidir; sağlayıcı davranışı değişirse regresyon testi gerekir. |
| Başarılı yeni public gönderimin tamamı | doğrulandı | Son Edge sürümünde gerçek widget tokenıyla tek kurgusal kayıt, bir başlangıç geçmişi ve bir idempotency makbuzu oluştu. Kayıt, geçmiş, makbuz ve teste ait rate-limit satırı exact sorgularla silindi; son sayımların tümü 0. | Canlı production hostname/origin oluşunca kısa smoke testi ayrıca yapılmalı; bu yerel-host kanıtının yerine geçmez. |

## 5. Rate-limit ve idempotency

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Küçük gerçek HTTP rate-limit | doğrulandı | Aynı istemciden beş kontrollü geçersiz doğrulama 400, altıncı 429 `RATE_LIMITED`; stres testi yapılmadı. Başlangıçta aktif satır 0'dı, oluşan tek satır sonunda silindi. | Tek IP arkasındaki çok kullanıcılı ağlar ortak kotayı paylaşabilir. |
| IP kaynağı ve sahte başlık | doğrulandı | Altı farklı istemci-supplied `x-forwarded-for` değeri sınırı aşamadı; hepsi 429 aldı. Bu, Supabase gateway'in istemci başlığını güvenilir zincirle değiştirdiğini gösterdi. | Hosting/gateway mimarisi değişirse aynı spoof testi yeniden yapılmalı; Edge doğrudan farklı altyapıya taşınmamalı. |
| Aynı anahtar + aynı içerik | doğrulandı | İlk üç eşzamanlı service RPC çağrısı bir özgün + iki duplicate üretti; public Edge tekrarı 202 `duplicate=true`; tek DB kaydı oluştu. Ayrı gerçek Turnstile ilk-insert yolu da son Edge sürümünde geçti. | İstemci belirsiz ağ sonucunda aynı anahtar ve aynı normalize içerikle tekrar denemeli. |
| Aynı anahtar + farklı içerik | doğrulandı | Aynı UUID farklı içerikle gerçek public HTTP'de 409 `IDEMPOTENCY_CONFLICT` aldı. | İstemci yeni kullanıcı niyeti için yeni anahtar üretmeli. |
| Eşzamanlı public tekrarlar | doğrulandı | Üç eşzamanlı public duplicate çağrısı tutarlı biçimde 202 döndü; Turnstile reddi kanıt olarak kullanılmadı. Kayıt/geçmiş/makbuz exact olarak temizlendi. | Birbirinden bağımsız geçerli Turnstile tokenlarıyla eşzamanlı ilk public insert insan etkileşimi gerektirir. |
| Teknik kayıt saklama/temizleme | doğrulandı | Rate penceresi 15 dakika, idempotency penceresi 24 saat; her rate çağrısı süresi geçen satırlardan en fazla 100'ünü fırsatçı temizliyor. Ham IP yerine secret-HMAC özeti tutuluyor. | Trafiksiz ortamda süresi geçmiş satırlar yeni çağrı gelene kadar fiziksel olarak kalabilir; ücretsiz planda günlük manuel bakım değerlendirilmeli. |

## 6. Auth ve oturum

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Başarısız giriş ve hesap varlığı | doğrulandı | Mevcut geçici kullanıcıya yanlış parola ve olmayan e-posta aynı `400/invalid_credentials` sonucunu verdi; uygulama ikisine de aynı metni gösteriyor. | Auth API davranışı platform sürümüyle değişirse tekrar test edilmeli. |
| Çıkış ve istemci state temizliği | eksik ve düzeltildi | İstemci çıkışı `scope: global` yapıldı. Gerçek geçici yöneticiyle logout 204, eski refresh token 400; React provider `finally` içinde feedback/liste/özet state'ini temizliyor. | Global çıkış tek yöneticinin diğer cihaz oturumlarını da kapatır; bu mevcut tek-yönetici mimarisinde bilinçli seçimdir. |
| Çıkış sonrası mevcut access tokenın yönetici yetkisi | eksik ve düzeltildi | `20261108003000_require_active_admin_session.sql`, JWT `session_id` değerinin aynı kullanıcıya ait güncel `auth.sessions` satırıyla eşleşmesini her `private.is_admin` kararına ekledi. Gerçek geçici yönetici özeti çıkıştan önce 200, global logout'tan sonra aynı access tokenla 403 `ADMIN_REQUIRED`; refresh de 400 aldı. | Supabase gateway stateless JWT'yi `exp` sonuna kadar tanıyabilir; güvence tüm yönetici RPC'lerinin `private.require_admin()` yolunu korumasına bağlıdır. Yeni yönetici RPC'si bu kontrolü atlamamalı. |
| Süresi gerçekten dolmuş access token | engellendi | İmzalı token üretmek güvenli değildir ve mevcut 1 saatlik expiry boyunca bekleme yapılmadı. | Gateway'in `exp` kontrolü platform özelliğidir ancak bu turda gerçek expired tokenla kanıtlanmadı. |
| Parola kurtarma, geçersiz/tekrar link | doğrulandı | Admin tarafından yalnız test kullanıcısı için üretilen gerçek recovery linki izinli yola döndü, parola güncellendi; aynı link ikinci kullanımda error parametresiyle reddedildi. İzin verilmeyen redirect site URL'ye düştü. | Varsayılan SMTP için hedef adresin organizasyon daveti kullanıcı tarafından kabul edildi; yeni teslim, Auth CAPTCHA etkinleştirilmeden ve e-posta kotası gözetilerek yeniden doğrulanmadı. |
| Kullanıcı arayüzünde recovery hesap gizliliği | doğrulandı | Servis SDK başarısı veya hatasından bağımsız aynı `{accepted:true}` sonucunu koruyor. Geçerli insan Turnstile tokenıyla kayıtlı yönetici isteği gerçek e-postayı teslim etti; ayrı geçerli tokenla kurgusal kayıt-dışı `example.invalid` isteği doğrudan `200` verdi. İki yol da aynı nötr “adres kayıtlıysa” görünümünde kaldı. Yalnız durum kodunu ölçen geliştirme probu kontrolden sonra kaldırıldı. | Tekrarlı isteklerin kullanıcı bazlı 60 saniye penceresi ve proje e-posta kotası farklı zamanlamalarda yeniden `429` yan kanalı oluşturabilir; kota tüketen tekrar matrisi yapılmadı. Platform/config değişikliğinde yeniden test edilmeli. |
| Giriş/recovery deneme koruması | doğrulandı | Giriş `admin_sign_in`, recovery `password_recovery` action'ıyla Turnstile widget kullanıyor. Gerçek endpoint'lerde giriş ve recovery için eksik/geçersiz tokenların dörtte dördü `400` CAPTCHA hatası aldı. Geçerli insan tokenı + gerçek şifre yönetici panelini açtı; geçerli recovery tokenı varsayılan SMTP ile gerçek e-postayı teslim etti. | Varsayılan SMTP deneme amaçlı, SLA'sız ve düşük kotalıdır. CAPTCHA hesap yetkilendirmesi değildir; allowlist/session/RPC kontrolleri zorunlu kalır. |

## 7. Gizli bilgiler, hata yönetimi ve bağımlılıklar

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| Repo çalışma ağacı secret taraması | doğrulandı | Ortam dosyasında yalnız browser-safe URL/publishable/site-key değişken adları var. Kaynakta secret terimleri yalnız server env okuma, migration rol adı, örnek placeholder ve belgelerde. Değerler çıktılanmadı. | Genel yüksek-entropi taraması yanlış negatif verebilir; yayın deposunda ayrıca platform secret scanning açılmalı. |
| Git geçmişi secret taraması | gerekçesiyle uygulanamaz | Repo `git rev-list --all` sonucunda sıfır commit içeriyor; taranacak geçmiş yok. | İlk commit öncesi `.env.local` ve build çıktısının ignore edildiği tekrar kontrol edilmeli. |
| Frontend env ve production build | doğrulandı | Live build'de `SUPABASE_SECRET_KEYS`, service-role ve Turnstile secret eşleşmesi 0. `sb_secret_` için bulunan tek eşleşme Supabase SDK'nın 10 karakterlik literal prefix kontrolü; anahtar değeri değil. | Publishable ve Turnstile site key build'de görünür; tasarım gereği public değerlerdir. |
| Loglama ve hata gövdeleri | eksik ve düzeltildi | Edge logları token/gövde/IP/iç not yazmıyor; Turnstile ve config ayrıntıları genel istemci koduna dönüştürüldü. Frontend raw DB error yerine sabit mesaj eşliyor. | Ücretsiz plan log saklama/izleme kapasitesi sınırlı olabilir; yayın sonrası operasyon politikası gerekli. |
| Güncel `npm audit` | doğrulandı | Bakım güncellemesinden sonra toplam 204 paket için info/low/moderate/high/critical toplamı 0. Üretim veya geliştirme zincirinde açık bildirim yok; `--force` kullanılmadı. | Registry yeni bildirim yayımladığında sonuç değişebilir; teslim ve düzenli bakımda tekrar çalıştırılmalı. |
| Uyumlu bağımlılık güncellemeleri | eksik ve düzeltildi | Semver aralığı içindeki `@tailwindcss/vite` ve `tailwindcss` 4.3.5, `@vitejs/plugin-react` 6.2.1'e güncellendi; test/lint/live build yeniden çalıştırıldı. | ESLint/@eslint/js 10 yeni major sürümleri bakım güncellemesi olarak uygulanmadı; güvenlik bildirimi yok, kontrollü migration gerekir. |
| Secret/service-role anahtarının frontend'de olmaması | doğrulandı | VITE değişken whitelist'i, `.env.example` uyarıları, build taraması ve kod ayrımı doğrulandı. Edge yeni `SUPABASE_SECRET_KEYS` değerini server ortamından alıyor. | Yerel makine veya Dashboard hesabı ele geçirilirse repo dışı secretlar yine risk altındadır. |

## 8. Yayına hazırlık

| Kontrol | Durum | Kısa kanıt | Kalan risk |
|---|---|---|---|
| CORS/origin | doğrulandı | Yerel izinli origin gerçek POST'ta çalıştı; originsiz ve farklı origin 403. CORS hiçbir yerde yönetici yetkisi yerine kullanılmıyor. | Üretim origin'i belli olunca tam HTTPS origin allowlist'e eklenmeli ve yerel originler canlıdan çıkarılmalı. |
| Auth redirect adresleri | doğrulandı | Mevcut uzak config yerel tam `/yonetici/sifre-yenile` yollarıyla eşleşiyor; kötü niyetli redirect gerçek linkte kabul edilmedi. | Üretim URL'si henüz yok; yayın öncesi yalnız tam HTTPS recovery yolu eklenmeli. |
| Turnstile hostname | yayın sonrası bekliyor | Kod exact hostname allowlist'i zorluyor; yerel hostname yapılandırmasıyla invalid-token yolu çalıştı. | Canlı hostname oluşmadan Dashboard widget ve Edge hostname allowlist'i doğrulanamaz. |
| HTTPS | yayın sonrası bekliyor | Supabase API/Edge çağrıları HTTPS; `_headers` içinde `upgrade-insecure-requests` ve HSTS var. | Frontend yayınlanmadığı için gerçek sertifika/HSTS ve HTTP→HTTPS yönlendirmesi doğrulanmadı. |
| CSP ve güvenlik başlıkları | eksik ve düzeltildi | `public/_headers` içine CSP, no-referrer, nosniff, DENY frame, Permissions-Policy ve HSTS eklendi. Tek inline style native `<progress>` ile kaldırıldı; CSP `style-src 'self'`, Turnstile script/frame originleriyle uyumlu. Live build `_headers` dosyasını içeriyor. | Hosting `_headers` formatını uygulamalı; gerçek response header ve Turnstile widget yüklemesi yayın sonrası tarayıcıda doğrulanmalı. |
| Demo/test araçları canlı build | doğrulandı | `showDemoTools` ancak hem `VITE_DATA_MODE=demo` hem açık `VITE_ENABLE_DEMO_TOOLS=true` olduğunda çalışıyor. Live build Supabase modunda alındı. | Yanlış deploy komutu demo build yayınlarsa gerçek backend kullanılmaz; CI komutu sabitlenmeli. |
| Netlify build, SPA ve header paketi | eksik ve düzeltildi | `netlify.toml` build komutunu `npm run build:live`, yayın klasörünü `dist` olarak sabitliyor. `public/_redirects` SPA fallback'i ve `public/_headers` güvenlik başlıkları live build sonucunda `dist/` içine kopyalandı. | Gerçek Netlify response header, HTTPS ve route yenilemesi frontend yayınlanmadan doğrulanamaz. |
| İş verisi saklama politikası | yayın sonrası bekliyor | Teknik kayıt süreleri tanımlı; feedback için yalnız yönetici manuel silmesi var, otomatik iş-verisi süresi yok. | İşletme sahibi amaç/süre/silme talebi politikasını ve yasal gereksinimleri yayın öncesi belirlemeli. |
| Hata izleme | yayın sonrası bekliyor | Edge güvenli sabit kod + request ID logluyor; ücretli servis açılmadı. | Alarm, sahip, inceleme sıklığı ve planın log saklama sınırı canlı kullanım öncesi belirlenmeli. |
| Yedekleme/kurtarma | yayın sonrası bekliyor | Veri kaybettiren işlem yapılmadı. Supabase ücretsiz plan için CLI ile düzenli off-site mantıksal dump öneriyor; ücretli PITR açılmadı. | Ücretsiz planda otomatik geri yüklenebilir günlük yedek güvencesi yok; şifreli yedek konumu, sıklık ve restore tatbikatı belirlenmeli. |

## Çalıştırılan kontroller ve temizlik özeti

- Uzak PostgreSQL: aktif-session maddesi dahil **32/32 pgTAP**, son `db lint`: hata yok.
- Gerçek yetki/CRUD matrisi: **46/46**.
- Public Edge yöntemi/doğrulama/gövde/rate-limit: **14/14**.
- Idempotency/eşzamanlılık: **6/6**.
- Gerçek Turnstile: son Edge sürümünde başarı + replay + 315 saniye expiry geçti; yalnız test kaydı/geçmişi/makbuzu/rate satırı temizlenip tüm son sayımlar **0** doğrulandı.
- Auth logout: geçici yöneticiyle 7/7 odaklı kontrol geçti; eski access token yönetici RPC'sinde 403, refresh 400 ve geçici kullanıcı/allowlist son sayımı **0**. Doğrudan recovery endpoint'inin 429/200 farkı açık risk olarak kaldı; uygulama sonucu nötrleştirildi.
- Auth CAPTCHA uzak kontrolü: ilk kayıttan sonra zorlamanın görünmediği açıkça raporlandı. Doğru projede yeniden kaydedildikten sonra eksik/geçersiz tokenlı giriş ve recovery isteklerinin tamamı `400` CAPTCHA reddi üretti.
- Auth geçerli akışları: insan Turnstile doğrulamasıyla yönetici girişi paneli açtı; tek gerçek recovery isteği e-postayı teslim etti. Geçerli tokenlı kurgusal kayıt-dışı recovery de `200` ve aynı nötr UI sonucunu verdi. Tekrarlı rate-limit matrisi e-posta kotası nedeniyle açık risk olarak bırakıldı.
- Sunum verisi: müşteri formunun normal Turnstile/Edge akışıyla üç `[ÖRNEK]` kayıt eklendi; panelde toplam **3**, Menü/Hizmet/Atmosfer dağılımı **1/1/1** doğrulandı. Kullanıcı onayıyla veritabanında bırakıldı; mevcut kayıtlara dokunulmadı.
- Yerel JavaScript: Auth CAPTCHA token aktarımı ve hata eşleme kontrolleri dahil tam test **42/42**; ESLint sıfır uyarı ve `build:live` başarılı.
- Bu turdaki geçici logout kullanıcıları/allowlist satırları ile Turnstile kurgusal feedback/geçmiş/makbuz/rate satırı ayrı sorgularda **0** bulundu. Mevcut yönetici/allowlist ve diğer verilere dokunulmadı.

Resmî dayanaklar:

- Supabase Auth rate limits: <https://supabase.com/docs/guides/auth/rate-limits>
- Supabase Auth sessions: <https://supabase.com/docs/guides/auth/sessions>
- Supabase Auth signout: <https://supabase.com/docs/guides/auth/signout>
- Supabase Auth CAPTCHA: <https://supabase.com/docs/guides/auth/auth-captcha>
- Supabase password recovery: <https://supabase.com/docs/guides/auth/passwords>
- Supabase production checklist: <https://supabase.com/docs/guides/security/production-checklist>
- Supabase backups: <https://supabase.com/docs/guides/platform/backups>
- Cloudflare Turnstile server validation: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- Cloudflare Turnstile CSP: <https://developers.cloudflare.com/turnstile/reference/content-security-policy/>
