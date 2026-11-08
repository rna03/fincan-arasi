import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { useFeedback } from "../context/feedbackContext";
import { readRecoveryIntent, scrubAuthParameters } from "../utils/authRecovery";

export function AdminResetPasswordPage() {
  const { authState, completePasswordRecovery, isDemo, operationLoading } = useFeedback();
  const navigate = useNavigate();
  const [intent] = useState(() => readRecoveryIntent(window.location.href));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (intent === "recovery" && authState.loading) return;
    scrubAuthParameters();
  }, [authState.loading, intent]);

  const linkState = isDemo || intent !== "recovery"
    ? "invalid"
    : authState.loading
      ? "checking"
      : authState.session
        ? "ready"
        : "invalid";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Yeni şifreniz en az 12 karakter olmalıdır.");
      return;
    }
    if (password !== confirmation) {
      setError("Şifre alanları birbiriyle eşleşmiyor.");
      return;
    }

    try {
      await completePasswordRecovery(password);
      setPassword("");
      setConfirmation("");
      navigate("/yonetici/giris", { replace: true, state: { passwordReset: true } });
    } catch {
      setPassword("");
      setConfirmation("");
      setError("Yeni şifre kaydedilemedi. Bağlantı geçersiz veya süresi dolmuş olabilir; yeni bir bağlantı isteyin.");
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

        <section className="mx-auto mt-8 max-w-xl rounded-[2rem] border border-[#d7cbbd] bg-[#fffdf8] p-6 shadow-[0_28px_90px_rgba(62,43,31,0.09)] sm:p-10" aria-labelledby="reset-title">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#e6f1ed] text-[#0e5c50]">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0e5c50]">Yeni şifre</p>
          <h1 id="reset-title" className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em]">Yönetici şifrenizi güncelleyin</h1>

          {linkState === "checking" ? (
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#bbd1c9] bg-[#eef6f2] p-5 text-[#24594f]" role="status">
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <p className="text-sm font-semibold">Kurtarma bağlantısı doğrulanıyor…</p>
            </div>
          ) : null}

          {linkState === "invalid" ? (
            <div className="mt-7">
              <div className="rounded-2xl border border-[#dfb49f] bg-[#fff3ed] p-5 text-[#81442f]" role="alert">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-bold">Bu bağlantı kullanılamıyor</p>
                    <p className="mt-1 text-sm leading-6">Bağlantı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir. Yeni bir sıfırlama bağlantısı isteyin.</p>
                  </div>
                </div>
              </div>
              <Link to="/yonetici/sifremi-unuttum" className="button-primary mt-5 min-h-12 w-full">
                Yeni bağlantı iste
              </Link>
            </div>
          ) : null}

          {linkState === "ready" ? (
            <form className="mt-7" onSubmit={handleSubmit}>
              <div className="flex items-start gap-3 rounded-2xl border border-[#bbd1c9] bg-[#eef6f2] p-4 text-sm leading-6 text-[#24594f]" role="note">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p>Bağlantı doğrulandı. En az 12 karakterden oluşan yeni şifrenizi belirleyin.</p>
              </div>

              <div className="mt-5">
                <label htmlFor="new-password" className="text-sm font-bold text-[#3e3029]">Yeni şifre</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                  disabled={busy}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-control mt-2 min-h-12"
                />
              </div>
              <div className="mt-5">
                <label htmlFor="confirm-password" className="text-sm font-bold text-[#3e3029]">Yeni şifreyi tekrar girin</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                  disabled={busy}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="field-control mt-2 min-h-12"
                />
              </div>

              {error ? (
                <p className="mt-4 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={busy || !password || !confirmation} className="button-primary mt-5 min-h-12 w-full">
                {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                {busy ? "Şifre güncelleniyor…" : "Yeni şifreyi kaydet"}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
