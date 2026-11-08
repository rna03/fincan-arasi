# Fincan Arası — Proje Planı

> Durum: Aşama 2 — uzak Supabase, Turnstile, parola kurtarma ve yönetici CRUD/kalıcılık doğrulandı
> Kapsam: Tek kafe, tek yönetici, kişisel bilgi istemeyen müşteri geri bildirimi

## 1. Problem ve çözüm

Kafe müşterilerinin öneri, sorun ve teşekkürlerini hızlıca iletebildiği; işletme yöneticisinin de bu kayıtları müşterinin özgün metnine dokunmadan inceleyip durumlandırabildiği, küçük ama güvenilir bir web uygulaması tasarlanacaktır.

Çözüm iki ayrı deneyim sunar:

- **Müşteri yüzü:** QR kod veya bağlantıyla açılan, hesap ya da iletişim bilgisi istemeyen kısa geri bildirim formu.
- **Yönetici yüzü:** Ayrı giriş ekranından ulaşılan; arama, filtreleme, istatistik, iç not, durum geçmişi ve onaylı silme akışları bulunan çalışma paneli.

QR kod yalnızca bağlantıyı taşır; erişim kontrolü değildir. Uygulama internetteki herkes tarafından açılabilir kabul edilir. “Tam anonim” veya “%100 güvenli” iddiasında bulunulmaz; form yalnızca isim, e-posta ve telefon istemez.

## 2. Kullanıcılar ve izinler

| İşlem | Müşteri / anonim ziyaretçi | Yetkili yönetici |
| --- | --- | --- |
| Formu açma | Evet | Evet |
| Yeni geri bildirim gönderme | Yalnızca doğrulanan sunucu fonksiyonu üzerinden | Gerekli değil |
| Kayıtları listeleme / arama | Hayır | Evet |
| Kayıt detayını görme | Hayır | Evet |
| Müşteri başlığını veya açıklamasını değiştirme | Hayır | Hayır |
| Durum ve iç not güncelleme | Hayır | Evet |
| Durum geçmişini görme | Hayır | Evet |
| Kaydı silme | Hayır | Evet, açık onayla |
| Yönetici hesabı oluşturma | Hayır | Uygulama içinden herkese açık kayıt yok; hesap kontrollü oluşturulur |

Frontend route koruması yalnızca kullanıcı deneyimi katmanıdır ve tek başına yetkilendirme sayılmaz. Gerçek izinler Supabase Auth, veritabanı yetkileri, RLS ve gerektiğinde sınırlı sunucu/RPC işlemleriyle uygulanır.

## 3. Sayfalar ve kullanıcı akışları

### `/` — Müşteri formu

1. Kullanıcı kısa marka ve açıklama alanını görür.
2. Öneri, sorun veya teşekkür türlerinden birini seçer.
3. Kategori, 5–100 karakter başlık ve 10–2000 karakter açıklama girer.
4. Alan bazlı doğrulama, sayaçlar, klavye odağı ve yükleniyor durumu kullanıcıya açıkça gösterilir.
5. Gönderim yalnızca servis çağrısı gerçekten başarılıysa alındı ekranına geçer.
6. Başarı ekranından yeni bir geri bildirim formu başlatılabilir.

Canlı bağlantıda istemci her gönderime tekil bir idempotency anahtarı ekler; Edge Function bu anahtarı merkezi ve kalıcı bir tabloda/benzersiz kısıtta tüketir. Gönderim sürerken butonun devre dışı kalması yalnızca ek kullanıcı deneyimi önlemidir; tek başına yinelenen kayıt koruması sayılmaz.

### `/yonetici/giris` — Yönetici girişi

- E-posta ve şifre alanları, hata, yüklenme ve erişilebilir form durumları bulunur.
- “Şifremi unuttum” bağlantısı hesap varlığını açıklamayan e-posta isteğine; tek kullanımlık bağlantı da yeni şifre ekranına gider.
- Aşama 1'de gerçek kimlik doğrulama yoktur; gerçek şifre istenmez ve sahte giriş yapılmaz.
- “Demo panelini aç” yolu gerçek giriş formundan görsel ve anlamsal olarak ayrıdır.
- Canlı modda demo yönetici erişimi derlemeye dahil edilmez/kullanılamaz.

### `/yonetici` — Yönetim paneli

1. Yönetici toplam, yeni, incelenen ve sonuçlanan kayıt özetlerini görür.
2. Kategori dağılımını inceler; metin araması ile tür, kategori ve durum filtrelerini birleştirir.
3. Listeden bir kayıt seçerek özgün metni, iç notu ve durum geçmişini açar.
4. Yalnızca durum ve iç not alanlarını günceller. Aynı durum yeniden kaydedilirse geçmiş satırı oluşmaz.
5. Silme, açıklayıcı bir modal ve ikinci onay adımıyla yapılır.
6. Yükleniyor, servis hatası, hiç kayıt olmaması ve filtre sonucunun boş olması ayrı durumlar olarak tasarlanır.

Masaüstünde kompakt yan menü + liste + detay çalışma alanı; mobilde alt/üst navigasyon, kart listesi ve tam ekran/akış içi detay düzeni kullanılır.

## 4. Veri modeli

### `feedback`

| Alan | Tür / kural |
| --- | --- |
| `id` | UUID, sunucu üretir, primary key |
| `type` | enum/check: `suggestion`, `issue`, `thanks` |
| `category` | enum/check: `menu`, `service`, `atmosphere`, `other` |
| `title` | text, trim sonrası 5–100 karakter |
| `message` | text, trim sonrası 10–2000 karakter |
| `status` | enum/check: `new`, `reviewing`, `planned`, `resolved`; varsayılan `new` sunucudan |
| `admin_note` | not null text, varsayılan boş metin, en fazla 2000 karakter |
| `created_at` | timestamptz, varsayılan `now()` sunucudan |
| `updated_at` | timestamptz, sunucu trigger/işlemiyle güncellenir |

### `feedback_status_history`

| Alan | Tür / kural |
| --- | --- |
| `id` | UUID, sunucu üretir, primary key |
| `feedback_id` | UUID, `feedback.id` foreign key |
| `previous_status` | feedback status enum; ilk kayıt için nullable olabilir |
| `new_status` | feedback status enum |
| `changed_by` | nullable UUID, yönetici değişikliğinde `auth.users.id` referansı |
| `actor_kind` | `system` veya `admin`; sistem kaydında `changed_by` null |
| `created_at` | timestamptz, varsayılan `now()` sunucudan |

Silme davranışı açıkça **ON DELETE CASCADE** olarak seçilir: yönetici bir geri bildirimi onayla sildiğinde ona ait durum geçmişi de aynı veritabanı işleminin parçası olarak silinir. Ayrı bir denetim kaydı gerekiyorsa ileride kişisel metin içermeyen, erişimi daha sıkı bir audit tablosu tasarlanır; bu aşamanın kapsamı değildir.

### Yönetici yetkisi

Uygulanan model, Data API'ye açılmayan `private.admin_allowlist` tablosudur (`user_id`, `created_at`, `created_by`). Allowlist'e yalnız güvenilir SQL/yönetim adımıyla ekleme yapılır; uygulamada herkese açık kayıt ekranı veya yetki verme RPC'si bulunmaz. Yetki kararı hiçbir zaman `user_metadata`, e-posta uzantısı veya yalnızca oturum açmış olma durumuna bağlanmaz.

### Gönderim idempotency ve hız sınırı

Uygulanan `private.feedback_submission_receipts`, UUID idempotency anahtarını içerik SHA-256 özetiyle 24 saat tutar; eşzamanlı istekler primary key ile tekilleştirilir ve anahtar farklı içerikle tekrar kullanılırsa reddedilir. `private.feedback_rate_limits`, güvenilir gateway IP bilgisinin server secret ile HMAC özetini sabit zaman penceresinde atomik sayaç olarak tutar. Ham IP ve form metni güvenlik tablolarına/loglara yazılmaz; süresi geçen satırlar fırsatçı bakım ile temizlenir.

## 5. Mimari

### Aşama 1: demo katmanı

```text
React sayfaları ve bileşenler
          │
          ▼
FeedbackService sözleşmesi
          │
          ▼
InMemoryFeedbackService ──> oturum belleğindeki örnek veriler
```

- React + Vite + JavaScript, React Router ve Tailwind CSS kullanılır.
- UI, veri kaynağını doğrudan bilmez; yalnızca tek servis sözleşmesini çağırır.
- Demo deposu modül belleğinde tek örnektir. Müşteri formu ile yönetici paneli aynı sekme/uygulama oturumunda aynı veriyi görür; tam sayfa yenileme başlangıç verisine döndürür.
- Servis `list`, `create`, `get`, `updateAdminFields`, `delete` işlemlerini ve gecikme/hata simülasyonunu kontrollü test seçenekleriyle sunar.
- Demo / canlı seçiminde `VITE_DATA_MODE=demo|supabase` açıkça zorunlu tutulur. Eksik canlı ayarında sessiz demo fallback yapılmaz.
- Gerçek servis henüz yoksa `supabase` modu anlaşılır yapılandırma hatası verir.

### Aşama 2: hedef canlı katman

```text
Müşteri tarayıcısı ──> doğrulanan Edge Function ──> feedback + idempotency/rate-limit

Yönetici tarayıcısı ──> Supabase Auth ──> RLS + grants ──> sınırlı RPC / tablolar
```

Netlify SPA yönlendirmesi ile frontend sunulur. İstemcide yalnızca publishable Supabase anahtarı bulunabilir; secret/service-role anahtarları Edge Function ortam sırlarında tutulur ve hiçbir `VITE_` değişkenine yazılmaz.

## 6. Güvenlik kararları

1. **RLS ve grants birlikte:** Exposed schema içindeki `feedback`, `feedback_status_history` ve yetki tablolarında RLS etkinleştirilir; `anon` rolünden doğrudan `select/insert/update/delete` yetkileri geri alınır. Politika eklemek tek başına mevcut grant'leri kaldırmaz.
2. **Anonim ekleme yok:** Müşteri eklemesi doğrudan Data API tablo insert'iyle yapılmaz. Herkese açık Edge Function; şemaya göre alan doğrulaması, uzunluk/enum kontrolü, normalize etme, bot doğrulaması ve kalıcı hız sınırından sonra sunucu tarafında kayıt oluşturur.
3. **Yönetici allowlist:** `authenticated` olmak yönetici olmak değildir. Her admin sorgusunda kullanıcı tarafından değiştirilemeyen korumalı allowlist/claim doğrulanır.
4. **Kolon koruması:** Yönetici özgün `title`, `message`, `type`, `category`, `created_at` alanlarını güncelleyemez. RLS satır kapsamını belirler; PostgreSQL column-level grants veya yalnızca `status`/`admin_note` kabul eden güvenli, sabit `search_path`'li sınırlı RPC kolon kapsamını uygular.
5. **Tutarlı geçmiş:** Durum güncelleme ve geçmiş ekleme tek sunucu işlemi/RPC içinde yapılır. `previous_status`, `new_status`, `changed_by` ve tarih sunucuda türetilir; istemciden gelen geçmişe güvenilmez. Durum değişmediyse geçmiş eklenmez.
6. **XSS önleme:** Kullanıcı metni yalnızca React metin düğümü olarak gösterilir; `dangerouslySetInnerHTML` kullanılmaz ve HTML çalıştırılmaz.
7. **Hata doğruluğu:** Ekleme, güncelleme veya silme yanıtı başarıyla dönmeden başarı durumu gösterilmez. Belirsiz ağ sonucunda idempotency anahtarıyla güvenli yeniden deneme yapılır.
8. **Kimlik doğrulama verisi:** Gerçek kullanıcı verisi veya auth sırları elle LocalStorage'a yazılmaz. Oturum, Supabase SDK'nın belgelenmiş yönetimiyle tutulur; XSS riskini azaltan CSP ve bağımlılık hijyeni ayrıca ele alınır.
9. **Bot ve CORS:** CORS, gizli URL veya yalnızca butonu kilitlemek spam koruması değildir. Kullanılacak bot doğrulama belirteci Edge Function'da sağlayıcıyla doğrulanır.
10. **Test:** `anon`, sıradan `authenticated` ve allowlist admin için izin/verme-red senaryoları SQL/RLS testleriyle doğrulanır.

## 7. Tasarım sistemi

- **Renk:** sıcak krem zemin, koyu espresso metin, derin petrol yeşili ana vurgu, sınırlı bakır detay.
- **Tipografi:** Türkçe karakter kapsamlı yerel/fallback serif başlık ailesi ve sistem sans-serif gövde ailesi. Uzak font bağımlılığı zorunlu değildir.
- **Yüzey:** ince, sıcak gri sınırlar; küçük yarıçap çeşitleri; az ve yumuşak gölge; geniş ama işlevsel boşluk.
- **Kompozisyon:** müşteri ekranında kısa iki kolonlu asimetri; mobilde doğrudan forma geçiş. Yönetici ekranında veri yoğunluğu yüksek ama okunaklı üç bölgeli düzen.
- **Durumlar:** hover, `:focus-visible`, seçili, disabled, loading, hata ve başarı renk/ikon/metin birlikte kullanılarak ayrılır.
- **Hareket:** yalnızca anlamlı 150–220 ms geçişler; `prefers-reduced-motion: reduce` ile animasyon/geçişler kapatılır.
- **Erişilebilirlik:** semantik başlık sırası, görünür label, açıklama ve hata bağlantıları, yeterli kontrast, klavye ile tam kullanım, modalda ilk odak + odak tuzağı + Escape + odağı tetikleyiciye geri verme.

## 8. Dört aşamalı yol haritası

### 1. Tasarım ve demo arayüz — bu tur

- Mimari plan ve tasarım sistemi
- Üç route ve responsive arayüz
- Tek servis arayüzü arkasında bellek içi demo CRUD
- Örnek veri, istatistikler, filtreler, durum geçmişi
- Form doğrulama ve demo servis testleri
- Lint, production build ve mümkünse 390/1440 px tarayıcı kontrolü

### 2. Gerçek veritabanı, auth, doğrulama ve yetkilendirme

- Supabase projesi, migrasyonlar ve enum/check/index'ler
- Auth yönetici hesabı ve korumalı allowlist/claim
- Grants, RLS politikaları ve kolon/RPC sınırları
- Müşteri Edge Function'ı; sunucu doğrulaması, idempotency, merkezi hız sınırı ve gerekirse bot doğrulama
- Demo servisten açık yapılandırmalı Supabase servisine geçiş

**8 Kasım 2026 durumu:** `soz-sende` (`ckanefuhclkcvlzfmiax`) projesine dört migration uygulandı. Son migration yönetici yetkisini allowlist yanında güncel `auth.sessions` satırına bağladı; gerçek global logout sonrası eski access token yönetici RPC'sinde 403 aldı. Uzak PostgreSQL aktif-session maddesi dahil 32/32 pgTAP geçti. Edge Turnstile başarı/replay/expiry ve Auth CAPTCHA eksik/geçersiz/geçerli akışları doğrulandı; tek recovery e-postası teslim edildi. Kayıtlı ve kurgusal kayıt-dışı recovery ilk istekleri aynı başarılı HTTP/nötr UI sonucunu verdi. Production origin/hostname/header kontrolleri ve tekrarlı recovery rate-limit yan kanalı açık bırakıldı; ayrıntı `docs/GUVENLIK_KONTROL.md` içindedir.

### 3. Uçtan uca test, güvenlik ve mobil düzeltmeler

- RLS/grants allow-deny testleri
- Form, auth, yönetim ve hata senaryoları E2E testleri
- 390 px ve 1440 px dahil responsive, klavye, ekran okuyucu ve modal kontrolleri
- XSS, çift gönderim, rate-limit, yetki yükseltme ve başarısız ağ denemeleri
- Performans ve bundle incelemesi

### 4. README, ekran görüntüleri, GitHub, yayın ve teslim

- Son README ve AI kullanım kaydı
- En az bir gerçek uygulama ekran görüntüsü
- Public GitHub deposu ve temiz teslim commit'i
- Netlify SPA yapılandırması ve canlı yayın
- GitHub + canlı URL doğrulaması ve ders teslim kontrolü

## 9. Kalan işler — karar ve yayın aşamalarına göre

Tamamlanan denetim sonuçları `docs/GUVENLIK_KONTROL.md` içinde korunur ve burada yeniden çalıştırılacak işler olarak listelenmez. Aşağıdaki maddeler **açıktır**; tasarım kararı veya gerçek ortam doğrulaması olmadan çözülmüş sayılmaz.

### Bu turda kapanan yayın öncesi kontroller

- [x] **Logout sonrası yönetici yetkisi:** İstemci global çıkış yapıyor; tüm yönetici RPC'leri JWT `session_id` ile güncel `auth.sessions` satırını eşleştiriyor. Gerçek testte çıkış öncesi özet 200, logout 204, aynı eski access tokenla özet 403 ve refresh 400 döndü.
- [x] **Son Edge sürümü ve gerçek Turnstile:** Gerçek widget tokenıyla tek kurgusal insert kabul edildi; aynı token replay'de ve ayrı token 315 saniye sonra reddedildi. Action/hostname zorlaması korunarak kayıt, geçmiş, makbuz ve rate-limit test satırı temizlendi.

### Yayın öncesi — açık kararlar ve kapatma ölçütleri

- [x] **Doğrudan Auth recovery yanıt ayrımı:** Giriş ve recovery formları ayrı Turnstile action'larıyla tokenı Supabase Auth'a iletiyor; token yoksa istemci çağrı başlatmıyor. Eksik/geçersiz tokenlar gerçek endpoint'te reddedildi. Geçerli tokenlı kayıtlı yönetici isteği e-postayı teslim etti; geçerli tokenlı kurgusal kayıt-dışı istek `200` verdi ve iki yol aynı nötr UI sonucunda kaldı. Tekrarlı 60 saniye rate-limit/kota zamanlaması yan kanal riski olarak işletim maddesinde açık tutuldu.
- [ ] **Gerçekten süresi dolmuş access token:** Logout edilmiş ama henüz `exp` süresi dolmamış eski token artık uygulama yetkisinde 403 alıyor. Gateway'in gerçek `exp` reddi mevcut bir saatlik tokenı bekleyerek ayrıca kanıtlanmadı; bu madde logout düzeltmesini geçersiz kılmaz, platform-expiry kanıtını açık tutar.
- [ ] İş verisi için saklama/silme süresi ve hata izleme sahipliği belirlenmeli. Ücretsiz planda şifreli mantıksal yedek sıklığı ile restore sorumlusu aşağıdaki işletim planına bağlandı; ilk dump/restore tatbikatı henüz yapılmadı.
- [x] Production URL ve barındırma seçimi kesinleşti: `https://fincan-arasi.netlify.app`, Netlify Free ve GitHub `main` sürekli yayını.

### GitHub hazırlığı — yayın öncesi depo işleri

- [x] `.env.local`, `dist/`, log, `supabase/.temp`, `.netlify` ve tek-seferlik uzak audit betikleri `.gitignore` ile ilk commit kapsamı dışında; birim testleri ve pgTAP korunuyor.
- [x] İlk commit öncesi 60 dosyalık liste, ignore kuralları, secret/kişisel veri ve örnek env dosyaları kontrol edildi; `main` çalışma ağacı temizdi.
- [x] Public `rna03/fincan-arasi` deposu oluşturuldu ve ilk commit push edildi; `.env.local`, `dist`, loglar ve geçici araçlar izlenmiyor.
- [x] Netlify CI/CD aynı GitHub deposunun `main` dalına deploy key ve webhook ile bağlandı.

### Canlı yayın sırasında — yalnız gerçek production değerleriyle

- [x] Netlify build komutu `npm run build:live`, yayın klasörü `dist`; SPA fallback ve security header dosyaları kaynakta hazırlandı.
- [x] Auth Site URL `https://fincan-arasi.netlify.app`, recovery redirect listesi yalnız tam `https://fincan-arasi.netlify.app/yonetici/sifre-yenile` yolu olacak şekilde uzak projeye uygulandı; yerel redirect'ler production config'den çıkarıldı.
- [ ] Edge `ALLOWED_ORIGINS` ve `TURNSTILE_ALLOWED_HOSTNAMES` yalnız kesin production adresiyle güncellendi; Cloudflare widget hostname kaydı ve gerçek token smoke testi kullanıcı panel onayı sonrası doğrulanacak.
- [ ] Netlify production build ortamında yalnız üç browser-safe Vite değeri ile `VITE_DATA_MODE=supabase` ve `VITE_ENABLE_DEMO_TOOLS=false` kaydedildi; uzak build/deploy sonucu bekleniyor.
- [ ] Gerçek response üzerinde HTTPS yönlendirmesi, sertifika, HSTS, CSP, `nosniff`, frame ve Permissions-Policy başlıkları; Turnstile widget yüklemesi ve SPA fallback birlikte doğrulanmalı.
- [ ] Son Edge sürümünün gerçekten hedef projede aktif olduğu ve frontend'in o sürüme çağrı yaptığı production smoke testinde doğrulanmalı. Bu kontrol, yukarıdaki ayrıntılı gerçek Turnstile matrisinin yerine geçmez.
- [ ] Gerçek production recovery e-postası teslimi, linkin yalnız izinli production adrese dönmesi ve hesap varlığını ayırt etmeyen kullanıcı deneyimi doğrulanmalı.
- [ ] Auth CAPTCHA etkinleştirildikten sonra gerçek yönetici girişi, recovery e-posta teslimi, eksik/geçersiz token reddi ve doğrudan recovery yanıt matrisi düşük e-posta kotası gözetilerek doğrulanmalı.
  - 8 Kasım gerçek kontrolü: İlk kayıttan sonra zorlamanın görünmediği raporlandı. Kullanıcı doğru projede Turnstile secret ile ayarı yeniden kaydetti; ardından giriş ve recovery için eksik/geçersiz tokenların dörtte dördü `400` CAPTCHA reddi aldı. Gerçek giriş, tek recovery teslimi ve mevcut/olmayan hesap yanıt karşılaştırması bekliyor.

### İşletim — yayın sonrasında sürekli sorumluluk

- [ ] Auth recovery hata/başarı yanıtları ve rate-limit davranışı sürüm değişikliklerinden sonra izlenmeli; SMTP/CAPTCHA ayarı değiştiğinde hesap-enumeration regresyon testi yapılmalı.
- [ ] Yönetici çıkışlarında çalınmış access token riski, JWT süresi ve allowlist'ten acil çıkarma prosedürü belgelenip periyodik olarak denenmeli.
- [ ] Edge/DB/Auth logları request ID üzerinden, token/form metni/ham IP kaydetmeden gözden geçirilmeli; alarm eşiği ve inceleme sıklığı belirlenmeli.
- [ ] Rate-limit satırlarının 15 dakikalık, idempotency makbuzlarının 24 saatlik penceresi ve fırsatçı temizliği izlenmeli; birikme görülürse mevcut kapsam içinde güvenli bakım planlanmalı.
- [ ] Mantıksal yedek alınmalı, şifreli ve ayrı konumda saklanmalı; veri kaybetmeyen bir restore tatbikatıyla gerçekten kullanılabildiği doğrulanmalı.
- [ ] `npm audit`, uyumlu bakım güncellemeleri, Supabase/Cloudflare güvenlik duyuruları ve secret rotasyonu düzenli bakım takvimine bağlanmalı; `--force` ile kontrolsüz yükseltme yapılmamalı.
- [ ] İki ay boyunca her hafta Netlify **Usage & billing** 300 kredi sınırı ve Supabase kullanım kotaları gözden geçirilmeli; gereksiz production deploy yapılmamalı.
- [ ] Her 5–6 günde bir gerçek bakım incelemesinde Supabase Dashboard proje durumu ve sahip e-postasındaki pause uyarıları kontrol edilmeli. Otomatik keep-alive/yapay trafik kurulmayacak; pause görülürse Dashboard'dan manuel **Resume project** uygulanacak.
- [ ] Netlify Free ve Supabase Free SLA sağlamaz. Netlify kredisi biterse dönem sonuna kadar, Supabase düşük etkinlikte duraklarsa manuel resume tamamlanana kadar kesinti olabilir; bu nedenle iki aylık erişilebilirlik ücretsiz planda garanti değildir.

## 10. Ders teslim kontrol listesi

- [x] Modern JavaScript çatısı planlandı: React + Vite.
- [x] CSS yaklaşımı planlandı: Tailwind CSS.
- [x] Fikir, ekranlar ve veri modeli AI desteğiyle planlandı.
- [x] AI destekli IDE kullanımı belgeleniyor.
- [x] Çalışan Aşama 1 arayüzü tamamlandı.
- [x] Form ve demo servis testleri geçti.
- [x] Lint ve production build geçti.
- [x] Aşama 2 Supabase kaynak kodu, migration, Edge Function ve kurulum rehberi hazırlandı.
- [x] Gerçek Supabase projesinde dört migration ve aktif-session kontrolü dahil 32/32 pgTAP güvenlik testi doğrulandı.
- [x] Auth sign-up kapatıldı ve Edge Function `ACTIVE` olarak dağıtıldı.
- [x] Tek yönetici Auth kullanıcısı allowlist'e eklendi; legacy anahtarlar kapatıldı ve ES256 imza doğrulandı.
- [x] Frontend gerçek Supabase moduna ve 5175 portuna geçirildi.
- [x] Parola kurtarma, geçersiz bağlantı durumu ve tam Auth redirect yolları tamamlandı.
- [x] Doğrudan Auth recovery tek-istek yanıt matrisi geçerli CAPTCHA altında kayıtlı hesap teslimi ve kayıt-dışı `200` sonucu ile doğrulandı; tekrarlı rate-limit matrisi işletim riski olarak açık.
- [x] Giriş ve parola kurtarma formları Turnstile tokenını Supabase Auth SDK'nın `captchaToken` alanına iletiyor; token yokken istek başlatılmıyor ve challenge her denemeden sonra sıfırlanıyor.
- [x] Supabase Auth CAPTCHA uzak projede etkinleştirildi; eksik/geçersiz token reddi, geçerli insan tokenıyla yönetici girişi ve tek gerçek recovery e-posta teslimi doğrulandı.
- [x] Üç sunum kaydı normal müşteri formu + Turnstile + Edge Function akışıyla tekil olarak oluşturuldu; panel toplamı 3 ve kategori dağılımı Menü/Hizmet/Atmosfer 1/1/1. Kullanıcı onayıyla kalıcı bırakıldı.
- [x] Logout sonrası eski access tokenın yönetici RPC yetkisi session doğrulamasıyla kaldırıldı ve gerçek tokenla doğrulandı.
- [ ] Gerçekten `exp` süresi dolmuş access token gateway reddi ayrıca doğrulandı.
- [x] 390 ve 1440 px gerçek müşteri ekran görüntüleri eklendi; yönetici paneli iki genişlikte görsel olarak kontrol edildi.
- [x] Gerçek anonim/allowlist dışı/yönetici yetki matrisi ve eşzamanlı rate-limit/idempotency kontrolleri tamamlandı.
- [x] Son Edge sürümünde gerçek Turnstile tokenıyla yeni insert/replay/expiry/action/hostname kontrolleri tamamlandı.
- [x] Public GitHub deposu oluşturuldu ve kaynak yüklendi.
- [ ] Netlify canlı yayını ve SPA yönlendirmesi doğrulandı.
- [ ] GitHub ve canlı bağlantı teslim edildi.

Backend, PostgreSQL ve uygulama içi AI ders koşulu olarak sunulmaz. Supabase PostgreSQL, farklı cihazlardan gelen kayıtların birleşmesi için ürün kararıdır. Uygulama içinde AI API'si, ML veya DL özelliği planlanmamaktadır.
