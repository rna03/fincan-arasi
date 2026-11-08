import { describe, expect, it } from "vitest";
import {
  createRateKeyHash,
  createRequestHash,
  getTrustedClientIp,
  isRequestTooLarge,
  isTurnstileResultValid,
  readRequestBody,
  validateSubmissionPayload,
} from "../../supabase/functions/submit-feedback/validation";

const validPayload = {
  feedback: {
    type: "suggestion",
    category: "menu",
    title: "  Bitki çayı seçeneği  ",
    message: "  Akşam saatlerinde kafeinsiz bir seçenek çok iyi olur.  ",
  },
  idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
  turnstileToken: "test-token",
};

describe("Edge Function gönderim doğrulaması", () => {
  it("beklenen gövdeyi kabul eder ve metni normalize eder", () => {
    const result = validateSubmissionPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.value.feedback.title).toBe("Bitki çayı seçeneği");
    expect(result.value.feedback.message).not.toMatch(/^\s|\s$/);
  });

  it("istemcinin yönetici ve durum alanlarını göndermesini reddeder", () => {
    const result = validateSubmissionPayload({
      ...validPayload,
      feedback: { ...validPayload.feedback, status: "resolved", admin_note: "gizli" },
    });
    expect(result).toMatchObject({
      valid: false,
      fieldErrors: { feedback: expect.any(String) },
    });
  });

  it("enum, uzunluk, UUID ve Turnstile sınırlarını sunucuda uygular", () => {
    const result = validateSubmissionPayload({
      feedback: { type: "unknown", category: "unknown", title: "az", message: "kısa" },
      idempotencyKey: "istemci-seçimi",
      turnstileToken: "",
    });
    expect(result.valid).toBe(false);
    expect(result.fieldErrors).toEqual(expect.objectContaining({
      type: expect.any(String),
      category: expect.any(String),
      title: expect.any(String),
      message: expect.any(String),
      idempotencyKey: expect.any(String),
      turnstileToken: expect.any(String),
    }));
  });

  it("büyük gövdeyi ve başarısız bot doğrulamasını reddeder", () => {
    expect(isRequestTooLarge("x".repeat(10_241))).toBe(true);
    expect(isTurnstileResultValid(
      { success: false, action: "feedback_submit", hostname: "localhost" },
      true,
      ["localhost"],
    )).toBe(false);
    expect(isTurnstileResultValid(
      { success: true, action: "other_action", hostname: "localhost" },
      true,
      ["localhost"],
    )).toBe(false);
    expect(isTurnstileResultValid(
      { success: true, action: "feedback_submit", hostname: "attacker.invalid" },
      true,
      ["localhost"],
    )).toBe(false);
    expect(isTurnstileResultValid(
      { success: true, action: "feedback_submit", hostname: "localhost" },
      false,
      ["localhost"],
    )).toBe(false);
  });

  it("content-length olmadan gelen gövdeyi akış sırasında sınırlar", async () => {
    const oversized = new Request("https://example.test", {
      method: "POST",
      body: "x".repeat(10_241),
    });
    const withinLimit = new Request("https://example.test", {
      method: "POST",
      body: "ç".repeat(5_120),
    });

    await expect(readRequestBody(oversized)).resolves.toMatchObject({ tooLarge: true });
    await expect(readRequestBody(withinLimit)).resolves.toMatchObject({
      tooLarge: false,
      text: "ç".repeat(5_120),
    });
  });

  it("yalnız platformun x-forwarded-for bilgisindeki ilk adresi kullanır", () => {
    expect(getTrustedClientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(getTrustedClientIp(new Headers({ "x-client-ip": "203.0.113.9" }))).toBe("");
  });

  it("içerik ve hız sınırı anahtarlarını deterministik ama birbirinden ayrık üretir", async () => {
    const firstHash = await createRequestHash(validPayload.feedback);
    const sameHash = await createRequestHash(validPayload.feedback);
    const differentHash = await createRequestHash({ ...validPayload.feedback, title: "Başka başlık" });
    const rateHashA = await createRateKeyHash("203.0.113.7", "secret-a");
    const rateHashB = await createRateKeyHash("203.0.113.7", "secret-b");

    expect(firstHash).toHaveLength(64);
    expect(firstHash).toBe(sameHash);
    expect(firstHash).not.toBe(differentHash);
    expect(rateHashA).toHaveLength(64);
    expect(rateHashA).not.toBe(rateHashB);
  });
});
