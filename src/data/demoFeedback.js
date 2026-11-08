const makeHistory = (feedbackId, changes) =>
  changes.map((change, index) => ({
    id: `${feedbackId}-history-${index + 1}`,
    feedback_id: feedbackId,
    previous_status: change.previous_status,
    new_status: change.new_status,
    changed_by: change.changed_by ?? "demo-admin",
    created_at: change.created_at,
  }));

export const DEMO_FEEDBACK = [
  {
    id: "demo-001",
    type: "suggestion",
    category: "menu",
    title: "Mevsimlik soğuk demleme seçeneği",
    message:
      "Yaz aylarında narenciye notaları taşıyan mevsimlik bir cold brew seçeneği menüye çok yakışabilir.",
    status: "new",
    admin_note: "",
    created_at: "2026-11-06T09:15:00.000Z",
    updated_at: "2026-11-06T09:15:00.000Z",
    history: makeHistory("demo-001", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-06T09:15:00.000Z",
      },
    ]),
  },
  {
    id: "demo-002",
    type: "issue",
    category: "service",
    title: "Tepsiler masada kayıyor",
    message:
      "Ahşap masalarda tepsiler kolayca kayıyor. Altı kaymaz küçük bir yüzey daha güvenli hissettirebilir.",
    status: "resolved",
    admin_note: "Yeni kaydırmaz altlıklı tepsiler bugün kullanıma alındı.",
    created_at: "2026-11-05T13:40:00.000Z",
    updated_at: "2026-11-06T08:30:00.000Z",
    history: makeHistory("demo-002", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-05T13:40:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "reviewing",
        created_at: "2026-11-05T15:10:00.000Z",
      },
      {
        previous_status: "reviewing",
        new_status: "resolved",
        created_at: "2026-11-06T08:30:00.000Z",
      },
    ]),
  },
  {
    id: "demo-003",
    type: "suggestion",
    category: "atmosphere",
    title: "Sessiz masa işareti olabilir",
    message:
      "Çalışmak isteyenler için pencere tarafındaki birkaç masayı sessiz alan olarak işaretlemek faydalı olabilir.",
    status: "reviewing",
    admin_note: "Hafta içi yoğunluğu ve masa kullanımını bir hafta gözlemliyoruz.",
    created_at: "2026-11-05T10:05:00.000Z",
    updated_at: "2026-11-05T16:20:00.000Z",
    history: makeHistory("demo-003", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-05T10:05:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "reviewing",
        created_at: "2026-11-05T16:20:00.000Z",
      },
    ]),
  },
  {
    id: "demo-004",
    type: "issue",
    category: "menu",
    title: "Bitkisel süt bilgisi daha görünür olsun",
    message:
      "Bitkisel süt seçeneklerini kasaya gelmeden görmek zor. Menüde küçük ve net bir işaret kullanılabilir.",
    status: "planned",
    admin_note: "Bir sonraki menü baskısına alerjen ve alternatif süt ikonları eklenecek.",
    created_at: "2026-11-04T14:25:00.000Z",
    updated_at: "2026-11-05T09:00:00.000Z",
    history: makeHistory("demo-004", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-04T14:25:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "planned",
        created_at: "2026-11-05T09:00:00.000Z",
      },
    ]),
  },
  {
    id: "demo-005",
    type: "thanks",
    category: "service",
    title: "Yoğun saatte bile çok naziktiniz",
    message:
      "Kasa sırası uzundu ama ekip herkese sakin ve özenli davrandı. Güzel karşılama için teşekkür ederim.",
    status: "resolved",
    admin_note: "Teşekkür ekip toplantısında paylaşıldı.",
    created_at: "2026-11-04T08:50:00.000Z",
    updated_at: "2026-11-04T17:45:00.000Z",
    history: makeHistory("demo-005", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-04T08:50:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "resolved",
        created_at: "2026-11-04T17:45:00.000Z",
      },
    ]),
  },
  {
    id: "demo-006",
    type: "issue",
    category: "atmosphere",
    title: "Pencere yanındaki priz çalışmıyor",
    message:
      "Arka tarafta pencereye yakın masanın yanındaki priz bugün çalışmıyordu; kontrol edilmesi iyi olabilir.",
    status: "new",
    admin_note: "",
    created_at: "2026-11-03T12:10:00.000Z",
    updated_at: "2026-11-03T12:10:00.000Z",
    history: makeHistory("demo-006", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-03T12:10:00.000Z",
      },
    ]),
  },
  {
    id: "demo-007",
    type: "suggestion",
    category: "menu",
    title: "Çocuklar için küçük porsiyon",
    message:
      "Bazı sandviçlerin çocuklara uygun küçük porsiyonu olsa hem israf azalır hem seçim yapmak kolaylaşır.",
    status: "planned",
    admin_note: "İki ürün için deneme porsiyonu ve maliyet çalışması hazırlanıyor.",
    created_at: "2026-11-02T15:35:00.000Z",
    updated_at: "2026-11-03T09:20:00.000Z",
    history: makeHistory("demo-007", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-02T15:35:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "planned",
        created_at: "2026-11-03T09:20:00.000Z",
      },
    ]),
  },
  {
    id: "demo-008",
    type: "thanks",
    category: "service",
    title: "Unuttuğum kitabı sakladığınız için teşekkürler",
    message:
      "Masada unuttuğum kitabı özenle ayırmışsınız. Ertesi gün hiç sorun yaşamadan teslim aldım, teşekkürler.",
    status: "reviewing",
    admin_note: "Kayıp eşya sürecini ekip rehberine kısa bir not olarak ekleyeceğiz.",
    created_at: "2026-11-02T09:45:00.000Z",
    updated_at: "2026-11-02T14:00:00.000Z",
    history: makeHistory("demo-008", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-02T09:45:00.000Z",
      },
      {
        previous_status: "new",
        new_status: "reviewing",
        created_at: "2026-11-02T14:00:00.000Z",
      },
    ]),
  },
  {
    id: "demo-009",
    type: "suggestion",
    category: "other",
    title: "Küçük bir kitap takas köşesi",
    message:
      "Okunmuş kitapların bırakılıp yenisinin alınabileceği küçük bir raf, kafenin sıcak havasına çok yakışır.",
    status: "new",
    admin_note: "",
    created_at: "2026-11-01T11:30:00.000Z",
    updated_at: "2026-11-01T11:30:00.000Z",
    history: makeHistory("demo-009", [
      {
        previous_status: null,
        new_status: "new",
        changed_by: "system",
        created_at: "2026-11-01T11:30:00.000Z",
      },
    ]),
  },
];

export const cloneDemoFeedback = () => structuredClone(DEMO_FEEDBACK);
