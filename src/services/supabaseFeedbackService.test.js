import { describe, expect, it, vi } from "vitest";
import { LiveServiceError, SupabaseFeedbackService } from "./supabaseFeedbackService";

function createClient(overrides = {}) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { accepted: true }, error: null }) },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: "admin" } } }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin" } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    ...overrides,
  };
}

describe("SupabaseFeedbackService", () => {
  it("arama, filtre ve sınırlı sayfalama parametrelerini RPC'ye geçirir", async () => {
    const client = createClient();
    client.rpc.mockResolvedValueOnce({
      data: { items: [{ id: "one", admin_note: null }], total: 73 },
      error: null,
    });
    const service = new SupabaseFeedbackService(client);

    const result = await service.list({
      search: " çay ", type: "suggestion", category: "menu", status: "new", page: 2, pageSize: 20,
    });

    expect(client.rpc).toHaveBeenCalledWith("admin_list_feedback", {
      p_search: "çay",
      p_type: "suggestion",
      p_category: "menu",
      p_status: "new",
      p_page: 2,
      p_page_size: 20,
    });
    expect(result).toMatchObject({ total: 73, page: 2, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ admin_note: "", history: [] });
  });

  it("müşteri gönderiminde yalnız doğrulanmış alanları Edge Function'a yollar", async () => {
    const client = createClient();
    const service = new SupabaseFeedbackService(client);
    await service.create(
      {
        type: "thanks",
        category: "service",
        title: "  Harika karşılama  ",
        message: "  Bugünkü sıcak karşılama için teşekkür ederim.  ",
        status: "resolved",
        admin_note: "istemciden gelmemeli",
      },
      { turnstileToken: "token", idempotencyKey: "123e4567-e89b-42d3-a456-426614174000" },
    );

    expect(client.functions.invoke).toHaveBeenCalledWith("submit-feedback", {
      body: {
        feedback: {
          type: "thanks",
          category: "service",
          title: "Harika karşılama",
          message: "Bugünkü sıcak karşılama için teşekkür ederim.",
        },
        idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
        turnstileToken: "token",
      },
    });
  });

  it("yönetici güncellemesinde optimistic concurrency zamanını zorunlu RPC'ye taşır", async () => {
    const client = createClient();
    client.rpc.mockResolvedValueOnce({ data: { id: "one", history: [] }, error: null });
    const service = new SupabaseFeedbackService(client);
    await service.updateAdminFields(
      "one",
      { status: "reviewing", admin_note: "Toplantıda incelenecek." },
      "2026-11-06T18:00:00.000Z",
    );

    expect(client.rpc).toHaveBeenCalledWith("admin_update_feedback", {
      p_feedback_id: "one",
      p_status: "reviewing",
      p_admin_note: "Toplantıda incelenecek.",
      p_expected_updated_at: "2026-11-06T18:00:00.000Z",
    });
  });

  it("sunucu çakışmasını kullanıcıya yeniden yükleme gerektiren hata olarak çevirir", async () => {
    const client = createClient();
    client.rpc.mockResolvedValueOnce({ data: null, error: { message: "FEEDBACK_CONFLICT" } });
    const service = new SupabaseFeedbackService(client);

    await expect(service.updateAdminFields(
      "one",
      { status: "planned", admin_note: "" },
      "2026-11-06T18:00:00.000Z",
    )).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("allowlist dışındaki oturumu yerelde kapatır ve hesap ayrıntısı sızdırmaz", async () => {
    const client = createClient();
    client.rpc.mockResolvedValueOnce({ data: false, error: null });
    const service = new SupabaseFeedbackService(client);

    await expect(service.signIn("user@example.com", "secret", "captcha-token")).rejects.toEqual(
      expect.objectContaining({
        message: "Giriş bilgileri doğrulanamadı veya bu hesap yetkili değil.",
        code: "INVALID_LOGIN",
      }),
    );
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("yönetici girişinde CAPTCHA tokenını Supabase Auth'a iletir", async () => {
    const client = createClient();
    client.rpc.mockResolvedValueOnce({ data: true, error: null });
    const service = new SupabaseFeedbackService(client);

    await service.signIn("admin@example.com", "secret", "captcha-token");

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
      options: { captchaToken: "captcha-token" },
    });
  });

  it("geçersiz CAPTCHA Auth hatasını girişte ayrıntı sızdırmadan reddeder", async () => {
    const client = createClient();
    client.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "captcha verification failed", code: "captcha_failed" },
    });
    const service = new SupabaseFeedbackService(client);

    await expect(service.signIn(
      "admin@example.com",
      "secret",
      "invalid-captcha-token",
    )).rejects.toMatchObject({
      code: "INVALID_LOGIN",
      message: "Giriş bilgileri doğrulanamadı veya bu hesap yetkili değil.",
    });
  });

  it("CAPTCHA tokenı olmadan Auth isteği başlatmaz", async () => {
    const client = createClient();
    const service = new SupabaseFeedbackService(client);

    await expect(service.signIn("admin@example.com", "secret", "")).rejects.toMatchObject({
      code: "VERIFICATION_REQUIRED",
    });
    await expect(service.requestPasswordReset(
      "admin@example.com",
      "http://127.0.0.1:5175/yonetici/sifre-yenile",
      "",
    )).rejects.toMatchObject({ code: "VERIFICATION_REQUIRED" });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("doğrulama olmadan canlı gönderimi başlatmaz", async () => {
    const service = new SupabaseFeedbackService(createClient());
    await expect(service.create({
      type: "issue",
      category: "other",
      title: "Deneme başlığı",
      message: "Bu metin doğrulama sınırını aşacak kadar uzundur.",
    })).rejects.toBeInstanceOf(LiveServiceError);
  });

  it("Turnstile iç yapılandırma kodunu kullanıcı mesajına taşımaz", async () => {
    const errorResponse = new Response(JSON.stringify({ code: "TURNSTILE_SECRET_REJECTED" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    const client = createClient({
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: { context: errorResponse },
        }),
      },
    });
    const service = new SupabaseFeedbackService(client);

    await expect(service.create(
      {
        type: "issue",
        category: "other",
        title: "Deneme başlığı",
        message: "Bu metin doğrulama sınırını aşacak kadar uzundur.",
      },
      { turnstileToken: "token", idempotencyKey: "123e4567-e89b-42d3-a456-426614174000" },
    )).rejects.toMatchObject({
      message: "Gönderim tamamlanamadı. Lütfen yeniden deneyin.",
    });
  });

  it("parola kurtarma isteğinde sabit yenileme adresini Supabase'e iletir", async () => {
    const client = createClient();
    const service = new SupabaseFeedbackService(client);

    await service.requestPasswordReset(
      "admin@example.com",
      "http://127.0.0.1:5175/yonetici/sifre-yenile",
      "captcha-token",
    );

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith("admin@example.com", {
      redirectTo: "http://127.0.0.1:5175/yonetici/sifre-yenile",
      captchaToken: "captcha-token",
    });
  });

  it("kurtarma isteği hatasında da hesap varlığını ayırt etmeyen nötr sonuç verir", async () => {
    const client = createClient();
    client.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "User does not exist", code: "hidden" },
    });
    const service = new SupabaseFeedbackService(client);

    await expect(service.requestPasswordReset(
      "missing@example.com",
      "http://127.0.0.1:5175/yonetici/sifre-yenile",
      "invalid-captcha-token",
    )).resolves.toEqual({ accepted: true });
  });

  it("kurtarma CAPTCHA hatasını da hesap ayrıntısı vermeyen nötr sonuca çevirir", async () => {
    const client = createClient();
    client.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "captcha verification failed", code: "captcha_failed" },
    });
    const service = new SupabaseFeedbackService(client);

    await expect(service.requestPasswordReset(
      "admin@example.com",
      "http://127.0.0.1:5175/yonetici/sifre-yenile",
      "invalid-captcha-token",
    )).resolves.toEqual({ accepted: true });
  });

  it("yönetici çıkışında tüm Auth oturumlarını global olarak iptal eder", async () => {
    const client = createClient();
    const service = new SupabaseFeedbackService(client);

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("yeni şifreyi yalnız Supabase Auth updateUser çağrısına verir", async () => {
    const client = createClient();
    const service = new SupabaseFeedbackService(client);

    await service.updatePassword("twelve-characters");

    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "twelve-characters" });
  });
});
