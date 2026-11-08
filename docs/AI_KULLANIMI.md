# Yapay Zekâ Kullanımı

Bu belge, Fincan Arası ders projesinin geliştirme sürecinde yapay zekâ desteğinin nerede ve nasıl kullanıldığını şeffaf biçimde kaydeder.

## Kullanılan ortam

Proje, yapay zekâ destekli Codex masaüstü geliştirme ortamında hazırlanmıştır. Asistan; dosya sistemini ve mevcut depo durumunu inceleme, resmî teknik belgeleri araştırma, kaynak kod üretme, komut çalıştırma ve doğrulama sonuçlarını raporlama görevlerinde kullanılmıştır.

## Yapay zekâdan alınan destek

### Fikir ve kapsam

- Tek kafe ve tek yönetici kapsamının birkaç günlük ders projesine uygun biçimde sınırlandırılması
- Müşteri ile yönetici deneyimlerinin ayrılması
- QR kodun erişim kontrolü olmadığı ve herkese açık kayıt/üyelik gibi kapsam dışı özelliklerin eklenmemesi
- Aşama 1 demo prototipi ile sonraki gerçek backend aşamalarının ayrılması

### Kullanıcı deneyimi ve görsel tasarım

- Müşteri formu, yönetici girişi ve yönetici paneli akışlarının planlanması
- Sıcak krem, espresso, petrol yeşili ve kontrollü bakır vurgulu tasarım sistemi
- Mobil ve masaüstü yerleşim önerileri
- Form hatası, yüklenme, başarı, boş liste ve filtre sonucu yok durumlarının tasarlanması
- Klavye odağı, modal davranışı, kontrast ve azaltılmış hareket kontrollerinin kabul ölçütlerine eklenmesi

### Veri ve güvenlik mimarisi

- `feedback` ve `feedback_status_history` veri modellerinin gözden geçirilmesi
- Frontend route korumasının yetkilendirme sayılamayacağının belgelenmesi
- Gerçek aşama için RLS ile PostgreSQL grant'lerinin birlikte planlanması
- Oturum açan her kullanıcıyı yönetici saymayan korumalı allowlist/claim yaklaşımı
- Özgün müşteri metnini korumak için sınırlı RPC veya kolon yetkisi önerisi
- Durum geçmişinin ve tarihlerin istemciye güvenmeden sunucuda üretilmesi
- Edge Function içinde doğrulama, kalıcı idempotency, merkezi hız sınırı ve gerekirse bot doğrulama tasarımı
- Secret/service-role anahtarlarının frontend'den uzak tutulması

### Uygulama ve test

- React bileşenleri, React Router sayfaları ve Tailwind sınıfları için kod taslağı
- Tek servis sözleşmesi arkasında değiştirilebilir bellek içi demo veri katmanı
- Kurgusal ve kişisel bilgi içermeyen örnek geri bildirimler
- Form doğrulaması ile demo CRUD/durum geçmişi için birim test senaryoları
- README, proje planı ve bu AI kullanım kaydının taslağı

## 6 Kasım 2026 doğrulama ve düzeltme turu

Yapay zekâ asistanı bu turda yalnız kod üretmekle kalmayıp sonuçları çalışan uygulamada kontrol etmek için kullanıldı:

- Mevcut Vite sunucusu yeniden kurulmadan ve gereksiz yeni sunucu açılmadan `http://127.0.0.1:5175/` üzerinden kullanıldı.
- Müşteri ekranındaki başlık, form aralıkları, tür/kategori kartları ve 150 px başlangıç yüksekliğindeki büyütülebilir açıklama alanı düzenlendi.
- Demo gizlilik metninin gerçek erişim koruması varmış gibi okunması engellendi; gerçek/kişisel veri girilmemesi açıklandı.
- Demo hata/yükleme araçları normal müşteri deneyiminden çıkarılıp `VITE_ENABLE_DEMO_TOOLS=true` kapısına bağlandı.
- Tarayıcı otomasyonu ile 390 × 844 ve 1440 × 900 görünüm kontrol edildi.
- Aynı SPA oturumunda müşteri gönderimi → yönetici listesi; birleşik arama/filtre; durum/not güncellemesi; istatistik ve geçmiş tutarlılığı; aynı durumun geçmişi çoğaltmaması; silme iptali akışları doğrulandı.
- Görsel test sırasında route geçişinin kaydırma konumunu taşıması, mobil detay panelinin eski yerel state göstermesi ve mobil geri dönüş düğmesinin işleyici eksikliği bulundu ve düzeltildi.
- Silme onayı, arayüz otomasyonuyla veri silmeden; servis testindeki kayıt + gömülü geçmiş silme senaryosuyla doğrulandı.
- Güncel `npm audit` çıktısı incelendi; üretim ve geliştirme bağımlılıkları ayrıldı. `--force` kullanılmadan kontrollü ESLint düzeltmesi uygulandı ve son audit sonucu sıfırlandı.

Bu doğrulama, gerçek backend, gerçek yönetici kimlik doğrulaması veya kalıcı veri bulunduğu anlamına gelmez. Tam sayfa yenilemede demo verileri başlangıç durumuna döner.

## 6 Kasım 2026 Aşama 2 backend hazırlığı

Yapay zekâ asistanı, mevcut tasarımı değiştirmeden gerçek Supabase veri yolunu yerel kaynak kodunda hazırlamak için kullanıldı:

- Güncel Supabase RLS, grants, database functions, Auth, Edge Function secrets ve pgTAP belgeleri ile Cloudflare Turnstile Siteverify belgesi incelendi.
- `feedback`, `feedback_status_history`, private yönetici allowlist'i, idempotency makbuzları ve kalıcı hız sınırı sayaçları için sürüm kontrollü SQL migration oluşturuldu.
- `anon` ve sıradan `authenticated` rollere doğrudan tablo erişimi verilmemesi; yönetici işlemlerinin açık kimlik/allowlist kontrolü yapan sınırlı RPC'lerden geçmesi kodlandı.
- Durum/not güncellemesinin tek transaction içinde geçmiş eklemesi, aynı durumda geçmiş üretmemesi ve `updated_at` ile çakışma bildirmesi uygulandı.
- Müşteri gönderimi için yöntem, JSON, 10 KiB gövde, enum ve metin uzunluğu doğrulayan; Turnstile'ı sunucuda doğrulayan; IP'yi ham saklamadan HMAC özetli kalıcı rate limit kullanan Edge Function yazıldı.
- İstemci yeniden denemelerinde aynı içeriği aynı idempotency anahtarıyla gönderen ve farklı içerikte anahtar tekrarını reddeden veri tabanı kısıtlı akış hazırlandı.
- Supabase Auth e-posta/şifre girişi, allowlist kontrolü, canlı modda demo önizlemesinin gizlenmesi, veri yüklenmeden önce oturum doğrulaması ve çıkışta React state temizliği uygulandı.
- Canlı yönetici listesi sunucu filtrelemesi, 20 kayıtlık sayfalama, tüm kayıtları temsil eden ayrı özet ve optimistic concurrency ile bağlandı.
- Edge doğrulama ve Supabase servis mock testleri eklendi; son odaklı düzeltmelerle yerel JavaScript test sayısı 38'e, pgTAP kontrolü 32'ye çıkarıldı.

Bu turda Supabase hesabı ve proje değerleri bulunmadı. Makinede Supabase CLI kurulu değildi; Docker CLI mevcut olsa da Docker motoru çalışmıyordu. Bu nedenle migration, RLS/Auth bağlamı, Edge Runtime, Turnstile ve kalıcılık testleri gerçek ortamda çalıştırılmadı. Asistan bu dosyaları “güvenliği doğrulanmış backend” olarak sınıflandırmamıştır.

## 7 Kasım 2026 uzak kurulum ve parola kurtarma turu

- Yalnız `ckanefuhclkcvlzfmiax` projesine migration ve yapılandırma uygulandı; son aktif-session genişletmesiyle uzak 32/32 pgTAP kontrolü geçti.
- Tek Auth kullanıcısı ve korumalı allowlist kaydı korundu; legacy API anahtarları ile legacy JWT secret kullanıcı tarafından devre dışı bırakıldı.
- Edge Function yeni secret anahtar modeliyle dağıtıldı. Turnstile secret düzeltildikten sonra gerçek müşteri formu tek kurgusal kayıt oluşturdu; aynı başlıkta ikinci kayıt olmadığı okundu.
- Kullanıcının mevcut şifresini paylaşmasına gerek bırakmamak için Supabase'in belgelenmiş `resetPasswordForEmail` ve `updateUser` akışı eklendi. Girişte “Şifremi unuttum”, yeni şifre ve geçersiz/süresi dolmuş bağlantı durumları tasarlandı.
- Auth yönlendirmesi genel yerel wildcard'lardan iki tam `/yonetici/sifre-yenile` adresine daraltıldı ve uzak yapılandırma farkı kalmadığı doğrulandı.
- Parola veya kurtarma tokenı loglanmadı. Kullanıcı e-postayı istedi, şifreyi yalnız tarayıcıda belirledi ve allowlist hesabıyla giriş yaptı. Tek kurgusal kaydın yönetici okuma, durum/iç not, geçmiş ve gerçek yenileme kalıcılığı tarayıcıda doğrulandı; yalnız bu kayıt geçmişiyle silindi. Uzak sayım feedback/geçmiş/orphan için `0/0/0`, Auth/allowlist için `1/1` verdi.
- Canlı geçmiş satırının yönetici aktörünü yanlışlıkla “Sistem” diye göstermesi ve canlı silme onayındaki eski “demo oturumu” ifadesi test sırasında bulundu; arayüz ve birim testiyle düzeltildi.

## 7 Kasım 2026 teslim öncesi güvenlik denetimi

- Önceki raporlar kanıt kabul edilmeden kod, migration, uzak katalog, gerçek HTTP davranışları, Auth, build ve bağımlılıklar yeniden incelendi.
- Gerçek geçici kullanıcıyla anonim/allowlist dışı/yönetici matrisinde 46 kontrol; public Edge'de 14; idempotency'de 6 kontrol geçti. Denetim verileri exact temizlendi.
- Büyük request gövdesinin belleğe alınmadan kesilmesi, 504'e dönüşen concurrency hatasının gerçek 409 olması, Auth kullanıcı silme/audit CHECK uyumu, recovery UI hesap gizliliği ve genel hata yanıtları düzeltildi.
- CSP/security header dosyası eklendi; inline chart stili native progress ile kaldırıldı. Son npm audit sıfır bildirim verdi; uyumlu Tailwind/Vite eklentisi bakım güncellemeleri uygulandı.
- İnsan Turnstile tokenı isteyen replay/expiry ve yeni public insert, ayrıca frontend yayınlanmadığı için production origin/hostname/HTTPS/header/yedek/izleme kontrolleri geçmiş gösterilmedi. Tam matris ve kalan riskler `docs/GUVENLIK_KONTROL.md` dosyasındadır.

## 8 Kasım 2026 açık güvenlik maddelerinin kapatılması

- Son Edge sürümünde gerçek managed Turnstile tokenıyla başarılı kurgusal gönderim, aynı token replay'i ve ayrı tokenın 315 saniye sonrası reddi doğrulandı. Token değerleri ekrana veya loga yazılmadı; yalnız test kaydı, geçmişi, makbuzu ve rate-limit satırı temizlendi.
- Supabase'in stateless access JWT davranışı resmî session/signout belgeleriyle yeniden değerlendirildi. `private.is_admin`, JWT `session_id` değerini güncel `auth.sessions` satırıyla eşleştirecek şekilde migration ile sertleştirildi; geçici yöneticiyle logout sonrası aynı eski tokenın 403 aldığı doğrulandı.
- Recovery arayüzü SDK hata/başarı sonucundan bağımsız tek nötr sonuç verecek şekilde sertleştirildi. Giriş ve recovery formlarına ayrı Turnstile action'ları ve Supabase Auth `captchaToken` aktarımı eklendi; eksik token çağrıdan önce durduruluyor, challenge her denemeden sonra sıfırlanıyor. Auth CAPTCHA etkinleştirildikten sonra eksik/geçersiz token reddi, insan doğrulamalı yönetici girişi ve gerçek recovery teslimi doğrulandı. Geçerli tokenlı kayıtlı ve kurgusal kayıt-dışı recovery ilk istekleri aynı başarılı HTTP/nötr UI sonucunu verdi; tekrarlı rate-limit zamanlaması açık risk olarak bırakıldı.
- Uzak pgTAP matrisi aktif-session maddesiyle 32/32'ye çıktı. Commit, push veya frontend yayını yapılmadı.

## Resmî belge doğrulaması

Asistanın sürüm ve mimari önerileri yalnız hafızaya dayanarak kabul edilmemiş; aşağıdaki güncel resmî belgelerle karşılaştırılmıştır:

- React kurulum ve sürüm belgeleri: <https://react.dev/learn/installation>
- Vite başlangıç ve Node uyumluluğu: <https://vite.dev/guide/>
- Tailwind CSS'in güncel Vite kurulumu: <https://tailwindcss.com/docs/installation/using-vite>
- React Router kurulumu: <https://reactrouter.com/start/declarative/installation>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase custom claims / RBAC: <https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac>
- Supabase Edge Function güvenliği: <https://supabase.com/docs/guides/functions/auth>
- Supabase database functions ve function privileges: <https://supabase.com/docs/guides/database/functions>
- Supabase database/pgTAP testleri: <https://supabase.com/docs/guides/database/postgres/testing-row-level-security>
- Supabase Edge Function secrets: <https://supabase.com/docs/guides/functions/secrets>
- Supabase password auth: <https://supabase.com/docs/guides/auth/passwords>
- Supabase Auth redirect URL'leri: <https://supabase.com/docs/guides/auth/redirect-urls>
- Cloudflare Turnstile sunucu doğrulaması: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>

Yerel Node.js 22.18.0 ile uyum için React Router 8 yerine desteklenen 7.18.5 sürümü seçilmiştir. Tailwind CSS v4'ün Vite eklentisi kullanılmış, eski `init -p` kurulumu kullanılmamıştır.

## 8 Kasım 2026 marka görselleri

Kullanıcının sağladığı Fincan Arası referansı, marka işareti ve dekoratif kafe illüstrasyonu için görsel yön olarak kullanıldı. Yerleşimin tamamı kopyalanmadı: yazısız ve şeffaf iki ayrı raster varlık yerleşik görsel üretim aracıyla oluşturuldu, yerelde kırpılıp web boyutuna indirildi. Marka adı ve “Fikrin masada yerini alsın.” ifadesi görsele gömülmedi; erişilebilir gerçek HTML metni olarak korundu. Müşteri ve yönetici düzenleri 390 ve 1440 px genişliklerde canlı tarayıcıda incelendi; gerçek müşteri ekran görüntüleri `docs/screenshots/` altında saklandı. Bu tasarım çalışması backend, Supabase, Turnstile veya açık güvenlik maddelerini değiştirmedi.

## İnsan kararı ve doğrulaması gereken noktalar

Yapay zekâ çıktıları nihai otorite değildir. Aşağıdaki kararlar geliştirici/öğrenci tarafından okunmalı, anlaşılmalı ve gerçek sonuçlarla doğrulanmalıdır:

- Görsel yönün ders beklentilerine ve kafenin gerçek marka diline uygunluğu
- Tüm metinlerin Türkçe anlatımı ve işletme tonuyla uyumu
- Form doğrulama sınırları ile veri saklama politikasının ürün ihtiyacına uygunluğu
- Supabase migrasyonları, grant'ler, RLS politikaları ve allow/deny güvenlik testleri
- Edge Function hız sınırı, bot doğrulama ve kişisel veri minimizasyonu kararları
- Görsel olarak doğrulanan 390 px / 1440 px düzenin farklı gerçek cihazlarda tekrarı, bütün akışın yalnız klavyeyle manuel tamamlanması ve gerçek ekran okuyucu denemeleri
- GitHub ve Netlify ayarları ile canlı ortam değişkenleri

Asistanın “çalışıyor” veya “güvenli” değerlendirmesi ancak karşılık gelen test/komut gerçekten çalıştırılıp sonucu incelendiyse kabul edilmelidir.

## Kullanılmayan yapay zekâ özellikleri

Fincan Arası uygulamasının içinde bir AI API'si, sohbet botu, makine öğrenmesi veya derin öğrenme özelliği bulunmaz. Yapay zekâ yalnız geliştirme sürecinde yardımcı araçtır; müşteri geri bildirimlerini otomatik analiz eden veya karar veren bir ürün özelliği değildir.

## Gizlilik ve örnek veri

Demo kayıtları kurgusaldır ve kişisel bilgi içermez. Geliştirme sırasında gerçek müşteri metni, gerçek yönetici şifresi veya Supabase secret/service-role anahtarı AI istemlerine, kaynak koduna ya da `VITE_` değişkenlerine konmamalıdır.

## Sınırlar

Bu belge Aşama 1 ve Aşama 2 yerel geliştirme kullanımını kaydeder. Supabase entegrasyon testleri, ekran görüntüleri, GitHub yüklemesi veya canlı yayın tamamlanmadıysa tamamlanmış gibi gösterilmez. Sonraki aşamalarda yapay zekâdan alınan yeni destek aynı belgeye tarih ve doğrulama sonucu ile eklenmelidir.
