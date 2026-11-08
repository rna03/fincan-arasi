import { describe, expect, it } from "vitest";
import { readRecoveryIntent } from "./authRecovery";

describe("readRecoveryIntent", () => {
  it("implicit kurtarma bağlantısını tanır", () => {
    expect(readRecoveryIntent(
      "http://127.0.0.1:5175/yonetici/sifre-yenile#access_token=secret&type=recovery",
    )).toBe("recovery");
  });

  it("PKCE kodlu kurtarma bağlantısını da tanır", () => {
    expect(readRecoveryIntent(
      "http://127.0.0.1:5175/yonetici/sifre-yenile?code=one-time-code",
    )).toBe("recovery");
  });

  it("süresi dolmuş veya reddedilmiş bağlantıyı ayrıntı sızdırmadan geçersiz sayar", () => {
    expect(readRecoveryIntent(
      "http://127.0.0.1:5175/yonetici/sifre-yenile#error=access_denied&error_code=otp_expired&error_description=hidden",
    )).toBe("invalid");
  });

  it("doğrudan açılan yenileme sayfasını kurtarma bağlantısı kabul etmez", () => {
    expect(readRecoveryIntent(
      "http://127.0.0.1:5175/yonetici/sifre-yenile",
    )).toBe("missing");
  });
});
