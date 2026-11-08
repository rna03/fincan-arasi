import { useState } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, Mail } from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { appConfig } from "../config/appConfig";
import { useFeedback } from "../context/feedbackContext";

export function AdminForgotPasswordPage() {
  const { isDemo, operationLoading, requestPasswordReset } = useFeedback();
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await requestPasswordReset(email, captchaToken);
      setSubmitted(true);
    } catch {
      setError("Parola sıfırlama isteği şu anda tamamlanamadı. Lütfen biraz sonra yeniden deneyin.");
    } finally {
      setCaptchaToken("");
      setCaptchaResetSignal((current) => current + 1);
    }
  }

  const busy = operationLoading.recovery;

  return (
    <main className="min-h-screen bg-[#f5f0e6] px-4 py-5 text-[#281b16] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <BrandMark compact />
          <Link
            to="/yonetici/giris"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-[#5f5047] transition hover:bg-white/60 hover:text-[#0e5c50] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/20"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Girişe dön
          </Link>
        </header>

        <section className="mx-auto mt-8 max-w-xl rounded-[2rem] border border-[#d7cbbd] bg-[#fffdf8] p-6 shadow-[0_28px_90px_rgba(62,43,31,0.09)] sm:p-10" aria-labelledby="forgot-title">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#e6f1ed] text-[#0e5c50]">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0e5c50]">Parola kurtarma</p>
          <h1 id="forgot-title" className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em]">Şifrenizi yenileyin</h1>
          <p className="mt-4 text-sm leading-6 text-[#66584f]">
            Yönetici e-posta adresinizi girin. Adres kayıtlıysa yeni şifre belirleyebileceğiniz tek kullanımlık bir bağlantı gönderilir.
          </p>

          {submitted ? (
            <div className="mt-7 rounded-2xl border border-[#bbd1c9] bg-[#eef6f2] p-5 text-[#24594f]" role="status">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">İsteğiniz alındı</p>
                  <p className="mt-1 text-sm leading-6">
                    Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve gereksiz e-posta klasörünü kontrol edin.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-7" onSubmit={handleSubmit}>
              <label htmlFor="recovery-email" className="text-sm font-bold text-[#3e3029]">E-posta</label>
              <input
                id="recovery-email"
                type="email"
                required
                disabled={isDemo || busy}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="yonetici@ornek.com"
                className="field-control mt-2 min-h-12"
              />

              {!isDemo ? (
                <div className="mt-5 rounded-xl border border-[#d8cfc1] bg-white p-3">
                  <TurnstileWidget
                    key={captchaResetSignal}
                    siteKey={appConfig.turnstileSiteKey}
                    action="password_recovery"
                    ariaLabel="Parola kurtarma bot koruması doğrulaması"
                    onTokenChange={setCaptchaToken}
                  />
                </div>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
                  {error}
                </p>
              ) : null}

              {isDemo ? (
                <p className="mt-4 rounded-xl border border-[#dfb49f] bg-[#fff3ed] p-3 text-sm font-semibold text-[#81442f]" role="note">
                  Parola kurtarma yalnızca gerçek veri modunda kullanılabilir.
                </p>
              ) : null}

              <button type="submit" disabled={isDemo || busy || !email || !captchaToken} className="button-primary mt-5 min-h-12 w-full">
                {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                {busy ? "Bağlantı hazırlanıyor…" : "Sıfırlama bağlantısı gönder"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
