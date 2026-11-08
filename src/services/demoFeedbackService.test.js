import { beforeEach, describe, expect, it } from "vitest";
import { DemoFeedbackService, DemoServiceError } from "./demoFeedbackService";

let idIndex = 0;
let currentTime = new Date("2026-11-06T18:00:00.000Z");
let service;

beforeEach(() => {
  idIndex = 0;
  currentTime = new Date("2026-11-06T18:00:00.000Z");
  service = new DemoFeedbackService({
    latencyMs: 0,
    now: () => currentTime,
    idFactory: () => `test-${++idIndex}`,
  });
});

describe("DemoFeedbackService", () => {
  it("dokuz örnek kaydı kopya olarak listeler ve filtreler", async () => {
    const all = await service.list();
    const menuSuggestions = await service.list({ type: "suggestion", category: "menu" });

    expect(all).toHaveLength(9);
    expect(menuSuggestions.length).toBeGreaterThan(0);
    expect(menuSuggestions.every((item) => item.type === "suggestion")).toBe(true);
    expect(menuSuggestions.every((item) => item.category === "menu")).toBe(true);

    all[0].title = "Dışarıdan değiştirildi";
    expect((await service.list())[0].title).not.toBe("Dışarıdan değiştirildi");
  });

  it("yeni müşteri kaydını sunucu alanları ve başlangıç geçmişiyle ekler", async () => {
    const created = await service.create({
      type: "thanks",
      category: "service",
      title: "İçten karşılama",
      message: "Bugünkü sıcak karşılama için bütün ekibe teşekkür ederim.",
      status: "resolved",
    });

    expect(created).toMatchObject({
      id: "demo-test-1",
      status: "new",
      admin_note: "",
    });
    expect(created.history).toHaveLength(1);
    expect(created.history[0]).toMatchObject({
      previous_status: null,
      new_status: "new",
      changed_by: "demo-system",
    });
    expect(await service.get(created.id)).toEqual(created);
  });

  it("durum değiştiğinde geçmiş ekler, aynı durum tekrar kaydedilince eklemez", async () => {
    const before = await service.get("demo-001");
    const updated = await service.updateAdminFields("demo-001", {
      status: "reviewing",
      admin_note: "Menü toplantısında değerlendirilecek.",
    });

    expect(updated.history).toHaveLength(before.history.length + 1);
    expect(updated.history.at(-1)).toMatchObject({
      previous_status: "new",
      new_status: "reviewing",
      changed_by: "demo-admin",
    });

    currentTime = new Date("2026-11-06T19:00:00.000Z");
    const sameStatus = await service.updateAdminFields("demo-001", {
      status: "reviewing",
      admin_note: "Not güncellendi.",
    });
    expect(sameStatus.history).toHaveLength(updated.history.length);
  });

  it("müşterinin özgün alanlarını yönetici güncellemesinden korur", async () => {
    await expect(
      service.updateAdminFields("demo-001", {
        status: "resolved",
        title: "Değiştirilmiş başlık",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_FIELDS" });
  });

  it("kayıt ve gömülü geçmişini birlikte siler", async () => {
    const removed = await service.delete("demo-002");

    expect(removed.id).toBe("demo-002");
    await expect(service.get("demo-002")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await service.list()).toHaveLength(8);
  });

  it("yalnızca sıradaki seçili işlemi deterministik olarak başarısız yapar", async () => {
    service.failNext("create", "Bağlantı denemesi başarısız.");

    const input = {
      type: "issue",
      category: "other",
      title: "Deneme kaydı",
      message: "Bu kayıt kontrollü hata akışını sınamak için hazırlandı.",
    };

    await expect(service.create(input)).rejects.toEqual(
      expect.objectContaining({
        message: "Bağlantı denemesi başarısız.",
        code: "SIMULATED_FAILURE",
      }),
    );
    await expect(service.create(input)).resolves.toMatchObject({ status: "new" });
  });

  it("doğrulama hatalarını ayrıntılarıyla döndürür", async () => {
    await expect(
      service.create({ type: "issue", category: "menu", title: "az", message: "kısa" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: expect.objectContaining({ title: expect.any(String), message: expect.any(String) }),
      }),
    );
  });

  it("reset ile başlangıç verisine döner", async () => {
    await service.delete("demo-001");
    expect(await service.list()).toHaveLength(8);

    await service.reset();
    expect(await service.list()).toHaveLength(9);
  });

  it("geçersiz gecikme değerini reddeder", () => {
    expect(() => service.setLatency(-1)).toThrow(TypeError);
    expect(new DemoServiceError("hata")).toBeInstanceOf(Error);
  });
});
