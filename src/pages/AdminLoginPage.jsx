import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LoaderCircle, LockKeyhole, ShieldAlert } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { DemoBanner } from "../components/DemoBanner";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { appConfig } from "../config/appConfig";
import { useFeedback } from "../context/feedbackContext";

export function AdminLoginPage() {
  const { authState, isDemo, operationLoading, signIn } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isDemo && !authState.loading && authState.isAdmin) {
      navigate("/yonetici", { replace: true });
    }
  }, [authState.isAdmin, authState.loading, isDemo, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await signIn(email, password, captchaToken);
      navigate("/yonetici", { replace: true });
    } catch (signInError) {
      setError(signInError.message || "Giriş tamamlanamadı.");
    } finally {
      setCaptchaToken("");
      setCaptchaResetSignal((current) => current + 1);
    }
  }

  const authBusy = operationLoading.auth || authState.loading;

  return (
    <main className="min-h-screen bg-[#f5f0e6] px-4 py-5 text-[#281b16] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <BrandMark compact />
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-[#5f5047] transition hover:bg-white/60 hover:text-[#0e5c50] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/20"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Forma dön
          </Link>
        </header>

        {isDemo ? <DemoBanner compact className="mt-5" /> : null}

        <div className="mt-6 grid overflow-hidden rounded-[2rem] border border-[#d7cbbd] bg-[#fffdf8] shadow-[0_28px_90px_rgba(62,43,31,0.09)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden bg-[#123f39] p-7 text-[#fffaf0] sm:p-10 lg:min-h-[42rem] lg:p-12" aria-labelledby="login-title">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border-[36px] border-white/5" aria-hidden="true" />
            <div className="absolute -bottom-36 -left-20 size-80 rounded-full border-[54px] border-[#b76432]/20" aria-hidden="true" />

            <p className="relative text-xs font-extrabold uppercase tracking-[0.2em] text-[#efb08a]">Yönetim alanı</p>
            <h1 id="login-title" className="relative mt-5 max-w-md font-serif text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
              Her notu dikkatle ele almak için.
            </h1>
            <p className="relative mt-6 max-w-md text-base leading-7 text-[#d9e7e1]">
              Geri bildirimleri incele, durumlarını güncelle ve işletme içi değerlendirme notlarını tek yerde tut.
            </p>

            <div className="relative mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <LockKeyhole className="size-5 text-[#efb08a]" aria-hidden="true" />
                <p className="mt-3 font-bold">Ayrı ve korumalı</p>
                <p className="mt-1 text-sm leading-6 text-[#bed2cb]">
                  {isDemo ? "Demo paneli gerçek bir erişim koruması değildir." : "Oturum ve yönetici yetkisi sunucu tarafından ayrı ayrı doğrulanır."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <KeyRound className="size-5 text-[#efb08a]" aria-hidden="true" />
                <p className="mt-3 font-bold">Yetki girişten fazlası</p>
                <p className="mt-1 text-sm leading-6 text-[#bed2cb]">Her oturum açan kullanıcı yönetici kabul edilmez.</p>
              </div>
            </div>
          </section>

          <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-14" aria-label="Yönetici giriş seçenekleri">
            <div className="max-w-lg">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0e5c50]">Yönetici girişi</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em]">Yönetici hesabınla giriş yap</h2>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#dfb49f] bg-[#fff3ed] p-4 text-sm leading-6 text-[#81442f]" role="note">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p>
                  {isDemo ? (
                    <><strong>Demo modunda gerçek kimlik doğrulama kullanılmaz.</strong> Gerçek e-posta veya şifre girmeyin.</>
                  ) : (
                    <><strong>Herkese açık hesap oluşturma yoktur.</strong> Yalnızca önceden oluşturulmuş ve allowlist'e eklenmiş yönetici hesabı erişebilir.</>
                  )}
                </p>
              </div>

              <form className="mt-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="admin-email" className="text-sm font-bold text-[#3e3029]">E-posta</label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    disabled={isDemo || authBusy}
                    autoComplete={isDemo ? "off" : "username"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isDemo ? "Canlı modda etkinleşir" : "yonetici@ornek.com"}
                    className="field-control mt-2 min-h-12"
                  />
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="admin-password" className="text-sm font-bold text-[#3e3029]">Şifre</label>
                    {!isDemo ? (
                      <Link
                        to="/yonetici/sifremi-unuttum"
                        className="text-sm font-bold text-[#0e5c50] underline decoration-[#0e5c50]/35 underline-offset-4 hover:text-[#09493f]"
                      >
                        Şifremi unuttum
                      </Link>
                    ) : null}
                  </div>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    disabled={isDemo || authBusy}
                    autoComplete={isDemo ? "off" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isDemo ? "Gerçek şifre girmeyin" : "Şifreniz"}
                    className="field-control mt-2 min-h-12"
                  />
                </div>

                {!isDemo ? (
                  <div className="mt-5 rounded-xl border border-[#d8cfc1] bg-white p-3">
                    <TurnstileWidget
                      key={captchaResetSignal}
                      siteKey={appConfig.turnstileSiteKey}
                      action="admin_sign_in"
                      ariaLabel="Yönetici girişi bot koruması doğrulaması"
                      onTokenChange={setCaptchaToken}
                    />
                  </div>
                ) : null}

                {error || authState.error ? (
                  <p className="mt-4 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
                    {error || authState.error}
                  </p>
                ) : null}

                {location.state?.passwordReset ? (
                  <p className="mt-4 rounded-xl border border-[#bbd1c9] bg-[#eef6f2] p-3 text-sm font-semibold text-[#24594f]" role="status">
                    Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isDemo || authBusy || !email || !password || !captchaToken}
                  className="button-primary mt-5 min-h-12 w-full"
                >
                  {authBusy && !isDemo ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                  {isDemo ? "Gerçek giriş demo modunda kapalı" : authBusy ? "Oturum doğrulanıyor…" : "Giriş yap"}
                </button>
              </form>

              {isDemo ? (
                <>
                  <div className="my-7 flex items-center gap-4" aria-hidden="true">
                    <span className="h-px flex-1 bg-[#e0d8ce]" />
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#96887e]">veya</span>
                    <span className="h-px flex-1 bg-[#e0d8ce]" />
                  </div>

                  <div className="rounded-2xl border border-[#bbd1c9] bg-[#eef6f2] p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0e5c50] text-white"><KeyRound className="size-5" aria-hidden="true" /></span>
                      <div>
                        <h3 className="font-serif text-xl font-semibold text-[#173d37]">Demo panel önizlemesi</h3>
                        <p className="mt-1 text-sm leading-6 text-[#4f6f68]">Şifresiz erişim yalnızca bu bellek içi prototipe aittir. Canlı modda gösterilmez.</p>
                      </div>
                    </div>
                    <Link to="/yonetici" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e5c50] px-5 font-extrabold text-white shadow-lg shadow-[#0e5c50]/15 transition hover:bg-[#09493f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/25">
                      Demo panelini şifresiz aç
                      <ArrowRight className="size-5" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
