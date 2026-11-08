import { describe, expect, it } from "vitest";
import { getHistoryActorLabel } from "./feedbackHistory";

describe("getHistoryActorLabel", () => {
  it("canlı allowlist yöneticisinin geçmiş kaydını yönetici olarak gösterir", () => {
    expect(getHistoryActorLabel({ actor_kind: "admin", changed_by: "admin-user-id" }))
      .toBe("Yönetici");
  });

  it("demo yönetici etiketini korur", () => {
    expect(getHistoryActorLabel({ changed_by: "demo-admin" })).toBe("Demo yönetici");
  });

  it("sistem kaydını sistem olarak gösterir", () => {
    expect(getHistoryActorLabel({ actor_kind: "system", changed_by: null })).toBe("Sistem");
  });
});
