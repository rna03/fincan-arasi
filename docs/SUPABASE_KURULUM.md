# Supabase Kurulum Rehberi

Bu rehber, Fincan Arası'nın gerçek veri modunu kurar. Gerçek anahtar, parola veya tokenları kaynak koda, sohbete ya da ekran görüntülerine koymayın. Panel metinleri zamanla değişebildiği için bu belge doğrulanmamış kesin menü yolları uydurmaz; ilgili resmî belge bağlantılarını esas alır.

## 1. Supabase projesini oluşturun

Supabase Dashboard üzerinden boş bir proje oluşturun. Proje hazır olduğunda proje referansını, Project URL'yi ve tarayıcı kullanımına uygun **publishable key** değerini kendi parola yöneticinizde tutun. Secret/service-role anahtarını frontend'e veya `VITE_` değişkenine koymayın.

Resmî kaynaklar:

- <https://supabase.com/docs/guides/getting-started>
- <https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys>

## 2. CLI ve yerel ortamı hazırlayın

Supabase CLI bu projede geliştirme bağımlılığı olarak kuruludur. Komutları proje kökünde `npx supabase ...` biçiminde çalıştırın. Yerel Supabase stack'i için ayrıca Docker Desktop ya da uyumlu bir container motoru gerekir:

- <https://supabase.com/docs/guides/local-development/cli/getting-started>

Bu depo zaten `supabase/config.toml` içerir. Yerel stack'i başlatmak için proje kökünde:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

`db reset` yalnız yerel geliştirme veritabanını migration'lardan yeniden kurar ve yerel veriyi siler. Mevcut uzak projede bu komutu kullanmayın.

Uzak projeyi CLI ile bağlayıp migration'ı uygulamak için, gerçek proje referansını yalnız kendi terminalinizde kullanın:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --remote=YOUR_PROJECT_REF --dry-run
npx supabase db push --remote=YOUR_PROJECT_REF
```

Migration'lar:

- `supabase/migrations/20261106213000_create_feedback_backend.sql`
- `supabase/migrations/20261106224500_add_foreign_key_indexes.sql`
- `supabase/migrations/20261107090000_harden_feedback_integrity.sql`

## 3. Migration'ın güvenlik modelini anlayın

Migration şu yapıları oluşturur:

- `public.feedback` ve `public.feedback_status_history`
- `private.admin_allowlist`
- Kalıcı idempotency makbuzları ve HMAC ile anonimleştirilmiş hız sınırı sayaçları
- Yalnız allowlist yöneticisine açık liste, detay, özet, güncelleme ve silme RPC'leri
- Yalnız service-role tarafından çağrılabilen müşteri gönderimi/idempotency/rate-limit RPC'leri

`anon` ve `authenticated` rollerinin tablolara doğrudan CRUD grant'leri geri alınır. RLS ayrıca açıktır. Yönetici güncelleme RPC'si yalnız `status` ve `admin_note` kabul eder; `updated_at` ile eşzamanlı değişiklik kontrolü yapar. Durum değişikliği ve geçmiş ekleme aynı transaction içindedir. Aynı durum yeniden kaydedilirse yeni geçmiş satırı eklenmez. Feedback silinince geçmiş `ON DELETE CASCADE` ile kaldırılır.

Resmî dayanak:

- <https://supabase.com/docs/guides/database/postgres/row-level-security>
- <https://supabase.com/docs/guides/database/functions>
- <https://supabase.com/docs/guides/database/postgres/testing-row-level-security>

## 4. Tek yönetici hesabını oluşturun

Auth ayarlarında herkese açık yeni kullanıcı kaydını ve anonim kullanıcı oluşturmayı kapalı tutun. E-posta/şifre sağlayıcısı açık kalabilir. Yönetici kullanıcısını Supabase'in güvenilir yönetim arayüzü veya Admin API'siyle oluşturun; uygulamada kayıt sayfası yoktur.

Kullanıcı oluşturulduktan sonra, güvenilir SQL yönetim oturumunda e-posta yerine mümkünse Auth kullanıcı UUID'sini kullanarak allowlist kaydını ekleyin:

```sql
insert into private.admin_allowlist (user_id)
values ('YOUR_ADMIN_AUTH_USER_UUID');
```

Bu SQL'i frontend'den çalıştırmayın ve allowlist eklemek için public bir RPC oluşturmayın. Oturum açabilmek yönetici olmak için tek başına yeterli değildir.

Auth yapılandırması: <https://supabase.com/docs/guides/auth/general-configuration>

## 5. Auth URL ayarlarını yapın

Auth projesinin Site URL ve izin verilen yönlendirme URL'lerini yalnız gerçekten kullandığınız yerel/canlı frontend adresleriyle sınırlandırın. Herkese açık sign-up kapalı kalmalıdır.

Bu uygulamada parola kurtarma isteği `/yonetici/sifremi-unuttum` sayfasından yapılır ve Supabase'e şu sabit dönüş yolu verilir:

```text
http://127.0.0.1:5175/yonetici/sifre-yenile
```

`localhost` ile geliştirme gerekiyorsa aynı yolun `http://localhost:5175` origin'li biçimi de izin listesinde bulunur. Canlı yayında genel `/**` wildcard yerine gerçek HTTPS origin'iyle tam parola-yenileme yolunu ekleyin. Kurtarma ekranı Supabase'in doğruladığı oturum üzerinden `updateUser({ password })` çağırır; başarıdan sonra yerel oturumu kapatır. Geçersiz, kullanılmış veya süresi dolmuş bağlantıların sağlayıcı ayrıntıları ve URL'deki auth parçaları kullanıcıya gösterilmez. E-posta isteğinin başarı mesajı hesabın var olup olmadığını açıklamaz.

Resmî dayanaklar:

- <https://supabase.com/docs/guides/auth/passwords#resetting-a-password>
- <https://supabase.com/docs/guides/auth/redirect-urls>
- <https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail>

### Auth CAPTCHA korumasını etkinleştirme

Giriş ve parola kurtarma formları aynı browser-safe `VITE_TURNSTILE_SITE_KEY` ile ayrı `admin_sign_in` ve `password_recovery` action'ları üretir. Token, Supabase SDK'da `signInWithPassword(..., { options: { captchaToken } })` ve `resetPasswordForEmail(..., { captchaToken })` çağrılarına iletilir; loglanmaz ve her denemeden sonra sıfırlanır.

Kod ve yerel testler hazır olmadan uzak ayarı açmayın. Hazır olduğunda Supabase Dashboard'da **Settings → Authentication → Bot and Abuse Protection** bölümünde CAPTCHA korumasını açın, sağlayıcı olarak **Cloudflare Turnstile** seçin, mevcut widget'ın secret değerini yalnız Dashboard alanına girin ve kaydedin. Secret değeri frontend env'ine, belgeye veya sohbete konmaz.

Ayar açıldıktan sonra düşük varsayılan e-posta kotasını gözeterek gerçek yönetici girişi, tek recovery teslimi, eksik/geçersiz CAPTCHA reddi ve doğrudan `/auth/v1/recover` mevcut/olmayan hesap matrisi yeniden doğrulanmalıdır. Bu kanıtlar olmadan Auth CAPTCHA veya recovery yanıt ayrımı çözülmüş sayılmaz.

Resmî dayanak: <https://supabase.com/docs/guides/auth/auth-captcha>

## 6. Turnstile ve Edge Function secret'larını ayarlayın

Cloudflare Turnstile'da frontend origin'lerinize uygun bir widget oluşturun. Site key tarayıcıda kullanılabilir; secret yalnız sunucuda kalır. Turnstile widget'ı tek başına koruma değildir: token Edge Function içinde Siteverify API ile doğrulanır.

- Sunucu doğrulaması: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- Test anahtarları: <https://developers.cloudflare.com/turnstile/troubleshooting/testing/>

Yerel geliştirme için:

1. `supabase/functions/.env.example` dosyasını `supabase/functions/.env` olarak kopyalayın.
2. `ALLOWED_ORIGINS` değerini gerçek frontend origin'leriyle doldurun.
3. `TURNSTILE_ALLOWED_HOSTNAMES`, `TURNSTILE_SECRET_KEY` ve uzun rastgele `RATE_LIMIT_HASH_SECRET` değerlerini doldurun.
4. Bu dosyayı commit etmeyin.

Hosted Edge Function secret'larını Dashboard'un güncel Edge Function secrets alanından veya kendi terminalinizde CLI ile ayarlayın. Secret değerlerini komut geçmişine yazmamak için yerel, Git dışındaki bir env dosyası kullanın:

```bash
npx supabase secrets set --env-file PATH_TO_PRIVATE_EDGE_ENV_FILE --project-ref YOUR_PROJECT_REF
```

Supabase, hosted ve yerel Edge Functions'a `SUPABASE_URL` ile secret key sözlüğünü kendisi sağlar. Edge Function bu secret key ile RLS'yi aşabildiğinden anahtar hiçbir zaman tarayıcıya gönderilmez.

Resmî secret rehberi: <https://supabase.com/docs/guides/functions/secrets>

## 7. Edge Function'ı çalıştırın ve dağıtın

Yerelde:

```bash
npx supabase functions serve submit-feedback --env-file supabase/functions/.env
```

Uzak projeye:

```bash
npx supabase functions deploy submit-feedback --project-ref YOUR_PROJECT_REF
```

`supabase/config.toml`, bu public müşteri endpoint'i için `verify_jwt = false` ayarlar. Bu ayar endpoint'i kendiliğinden güvenli yapmaz. Function ayrıca origin, yöntem, içerik türü, 10 KiB gövde sınırı, alan/enum/uzunluk, Turnstile, kalıcı hız sınırı ve idempotency kontrollerini uygular. CORS erişim yetkisi veya spam koruması olarak kabul edilmez.

## 8. Frontend yerel değişkenlerini ekleyin

Proje kökünde Git dışında kalan `.env.local` dosyası oluşturun:

```dotenv
VITE_DATA_MODE=supabase
VITE_ENABLE_DEMO_TOOLS=false
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_BROWSER_SAFE_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY=YOUR_BROWSER_SAFE_TURNSTILE_SITE_KEY
```

Ardından:

```bash
npm run dev:live
```

Gerçek modda bu değerlerden biri eksikse uygulama demoya düşmez; açıklayıcı kurulum hatası gösterir. Demo yönetici önizlemesi gerçek modda gösterilmez.

## 9. Doğrulama sırası

Önce yerel veritabanı testini çalıştırın:

```bash
npm run test:db
```

Docker kullanılamıyorsa, test dosyasındaki `BEGIN`/`ROLLBACK` sınırı korunarak bağlı uzak projede doğrudan çalıştırılabilir. Hedef referansı komutta açıkça verin:

```bash
npx supabase db query --remote=YOUR_PROJECT_REF --file supabase/tests/database/feedback_security_test.sql --yes
```

Test koşumu `finish()` sonucunu SQL hatasına dönüştürür; başarılı çıktı açıkça `32/32 pgTAP kontrolü başarılı` demelidir. Testten sonra sabit kurgusal UUID'lerin hiçbir tabloda kalmadığını ayrıca kontrol edin.

Ardından gerçek kimlik bağlamlarıyla şu matrisi doğrulayın:

1. `anon`: doğrudan `select/insert/update/delete` engelli.
2. Allowlist dışı `authenticated`: yönetici RPC'leri, allowlist ve service-role RPC'leri engelli.
3. Allowlist yöneticisi: liste/detay/özet okuyabiliyor; yalnız durum/not güncelleyebiliyor; özgün müşteri metni değişmiyor.
4. Aynı durum ikinci kez kaydedildiğinde geçmiş sayısı değişmiyor.
5. Çakışan eski `updated_at` güncellemesi kullanıcıya conflict olarak dönüyor.
6. Yalnız test için oluşturulan kurgusal kayıt silinince geçmişi de kaldırılıyor.
7. Edge Function geçersiz/büyük gövdeyi, yanlış origin'i ve başarısız Turnstile sonucunu reddediyor.
8. Aynı idempotency anahtarı + aynı içerik tek kayıt üretiyor; aynı anahtar + farklı içerik `409` alıyor.
9. Hız sınırı eşzamanlı isteklerde kalıcı veritabanı sayacıyla uygulanıyor.
10. Yönetici sayfası gerçek yenilemeden sonra Auth oturumu ve veritabanı kaydıyla yeniden yükleniyor.

Son frontend kontrolleri:

```bash
npm run test
npm run lint
npm run build
```

## 10. Geçici güvenlik kayıtlarının temizliği

Rate-limit satırları pencere sonunda; idempotency makbuzları 24 saat sonunda geçersiz olur. Her yeni hız sınırı kontrolü, süresi geçmiş satırlardan sınırlı bir grubu fırsatçı olarak temizler. Trafiğin uzun süre olmadığı ortamlarda, Supabase Cron kullanılabiliyorsa aynı tablolarda `expires_at < now()` koşuluyla günlük bakım görevi planlanabilir. Bu kayıtlar ham IP veya form metni içermez; IP yalnız sunucu secret'ıyla HMAC özeti olarak tutulur.

## Bu çalışma ortamındaki durum — 9 Kasım 2026

- Yalnız `soz-sende` projesi (`ckanefuhclkcvlzfmiax`) bağlandı ve hedef her uzak komutta açıkça doğrulandı.
- Dört migration uzak projeye uygulandı; son migration yönetici yetkisini allowlist yanında güncel Auth session satırına bağladı ve yerel/uzak migration geçmişleri eşleşiyor.
- Auth sign-up kapalıdır. Production Site URL `https://fincan-arasi.netlify.app`, redirect listesi yalnız `https://fincan-arasi.netlify.app/yonetici/sifre-yenile`; config push sırasında uzaktaki CAPTCHA/e-posta/MFA ayarları değiştirilmedi.
- `submit-feedback` Edge Function sürüm 1 olarak dağıtıldı ve `ACTIVE` durumu doğrulandı.
- Aktif-session maddesi dahil 32/32 pgTAP kontrolü uzak PostgreSQL üzerinde transaction içinde geçti. Kurgusal feedback, history, session ve Auth test UUID'lerinin işlem sonrasında `0` kayıt bıraktığı doğrulandı.
- Canlı şema lint'i hata vermedi. Danışmanlarda private tablolardaki politikasız RLS ve allowlist kontrolü yapan yönetici `SECURITY DEFINER` RPC'leri bilinçli tasarım uyarılarıdır. Üç eksik foreign-key indeksi ikinci migration ile eklendi; boş projedeki kullanılmamış indeks bilgileri beklenen başlangıç durumudur.
- Tek gerçek Auth kullanıcısı oluşturuldu ve UUID değeri çıktılanmadan `private.admin_allowlist` içine eklendi; kullanıcı ve allowlist sayıları `1/1` olarak doğrulandı.
- Legacy `anon`/`service_role` API anahtarları kullanıcı tarafından devre dışı bırakıldı ve legacy JWT secret revoke edildi. JWKS ucu aktif imzayı ES256 olarak gösteriyor. Edge Function yalnız `SUPABASE_SECRET_KEYS` içindeki yeni secret anahtarı kullanır; legacy service-role fallback'i kaldırıldı.
- Frontend `.env.local`, gerçek proje URL'si, publishable anahtar ve Cloudflare site key ile Supabase modundadır. Netlify production build ortamına yalnız bu üç public değer ile `VITE_DATA_MODE=supabase` ve `VITE_ENABLE_DEMO_TOOLS=false` aktarıldı; server secret'ları Supabase Edge ortamında kaldı.
- Düzeltilen Turnstile secret ile gerçek müşteri gönderimi başarılı oldu. `Kurgusal canlı test kaydı` başlıklı tam bir kayıt bulunduğu ve yanlışlıkla ikinci kayıt oluşmadığı doğrulandı.
- Yönetici girişi için `/yonetici/sifremi-unuttum` ve `/yonetici/sifre-yenile` akışları eklendi. Remote Auth Site URL ve redirect listesi yalnız production origin ile tam Netlify parola-yenileme yoluna daraltıldı; `config diff` sonrasında bu alanda fark kalmadı. Geçersiz/süresi dolmuş bağlantı görünümü, auth URL parçalarının temizlenmesi, önceki gerçek yeni şifre akışı ve canlı Netlify recovery yönlendirmesi doğrulandı.
- Tek kurgusal kayıt yönetici panelinde okundu; durumu `reviewing` ve iç notu güncellendi. Liste, detay ve özet aynı durumu gösterdi; geçmişte ilk `new` kaydına ek olarak `new → reviewing` satırı oluştu. Gerçek sayfa yenilemesinden sonra oturum, durum, not ve geçmiş kalıcı kaldı.
- Yalnız `Kurgusal canlı test kaydı` yönetici panelinden silindi. Son uzak sayımda eşleşen feedback `0`, toplam feedback `0`, toplam geçmiş `0` ve orphan geçmiş `0`; Auth kullanıcısı ile allowlist kaydı `1/1` kaldı. Böylece `ON DELETE CASCADE` temizliği gerçek ortamda doğrulandı.
- Güvenlik denetiminde gerçek allowlist-dışı Auth kullanıcısı, küçük HTTP rate-limit, sahte IP başlığı ve eşzamanlı idempotency denemeleri geçti. Çakışma kodu gerçek 409'a çevrildi; Auth kullanıcısı silinince audit geçmişinin korunması düzeltildi. Son Edge sürümünde gerçek Turnstile başarı, replay ve 315 saniye expiry geçti; yalnız production hostname/origin smoke testi yayına kaldı.
- Auth CAPTCHA doğru projede Cloudflare Turnstile ile etkinleştirildi. Giriş ve recovery için eksik/geçersiz tokenların tamamı gerçek endpoint'te reddedildi; insan doğrulamalı yönetici girişi ve varsayılan SMTP ile tek recovery e-posta teslimi geçti. Kayıtlı ve kurgusal kayıt-dışı geçerli recovery ilk istekleri aynı başarılı HTTP/nötr UI sonucunu verdi; tekrarlı kota/rate-limit zamanlaması işletim riski olarak açık tutuldu.
- Sunum için üç `[ÖRNEK]` geri bildirim normal müşteri formu üzerinden oluşturuldu ve panelde Menü/Hizmet/Atmosfer kategorilerinde 1'er kayıt olarak doğrulandı. Bunlar kullanıcı onayıyla kalıcı bırakıldı; test temizliğinin parçası değildir.
- Netlify `fincan-arasi` sitesi GitHub `rna03/fincan-arasi` deposunun `main` dalına bağlandı. Edge `ALLOWED_ORIGINS` yalnız `https://fincan-arasi.netlify.app`, `TURNSTILE_ALLOWED_HOSTNAMES` yalnız `fincan-arasi.netlify.app`; kalan secret adları değerleri gösterilmeden doğrulandı.
- Canlı Netlify origin'i Edge preflight'ta `204` ve tam CORS origin başlığı aldı; farklı origin `403` ve başlıksız reddedildi. İnsan Turnstile tokenlı production POST başarılı oldu. Tek canlı test kayıt yönetici panelinde güncellendi, yenilemede kalıcı kaldı ve geçmişiyle silindi; son feedback/geçmiş sayımı `3/3`, allowlist `1`. Teknik idempotency makbuzu tasarım gereği en fazla 24 saat tutulur.
- Auth local/remote production URL config farkı `0`. Varsayılan servisle tek canlı recovery e-postası teslim edildi ve bağlantı tam Netlify `/yonetici/sifre-yenile` yolunu açtı; parola değiştirilmedi ve tekrarlı kota matrisi çalıştırılmadı.
- Docker Desktop eski kilitli bir geçici soket nedeniyle motoru başlatamadı. Fabrika sıfırlaması veya veri silme yapılmadı; pgTAP doğrulaması Docker gerektirmeyen uzak SQL yolu ile tamamlandı.
