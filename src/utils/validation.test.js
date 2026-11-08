import { describe, expect, it } from "vitest";
import {
  hasValidationErrors,
  normalizeFeedback,
  validateAdminFields,
  validateFeedback,
} from "./validation";

describe("validateFeedback", () => {
  it("geçerli bir müşteri gönderimini kabul eder", () => {
    const errors = validateFeedback({
      type: "suggestion",
      category: "menu",
      title: "Yeni tatlı fikri",
      message: "Mevsim meyveleriyle hazırlanan küçük bir tatlı güzel olabilir.",
    });

    expect(errors).toEqual({});
    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("tür, kategori ve uzunluk kurallarını alan bazında bildirir", () => {
    const errors = validateFeedback({
      type: "other-type",
      category: "",
      title: "Kısa",
      message: "az",
    });

    expect(errors).toMatchObject({
      type: expect.any(String),
      category: expect.any(String),
      title: expect.any(String),
      message: expect.any(String),
    });
  });

  it("başlık ve açıklamadaki dış boşlukları uzunluğa katmaz", () => {
    const normalized = normalizeFeedback({
      type: "thanks",
      category: "service",
      title: "  Çok teşekkürler  ",
      message: "  Bugünkü sıcak karşılama için teşekkür ederim.  ",
    });

    expect(normalized.title).toBe("Çok teşekkürler");
    expect(normalized.message).toBe("Bugünkü sıcak karşılama için teşekkür ederim.");
    expect(validateFeedback(normalized)).toEqual({});
  });
});

describe("validateAdminFields", () => {
  it("bilinmeyen durum ve 2000 karakteri aşan notu reddeder", () => {
    const errors = validateAdminFields({
      status: "archived",
      admin_note: "n".repeat(2001),
    });

    expect(errors.status).toBeDefined();
    expect(errors.admin_note).toBeDefined();
  });
});
