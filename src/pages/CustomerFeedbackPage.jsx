import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Heart,
  Leaf,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { DemoBanner } from "../components/DemoBanner";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { appConfig } from "../config/appConfig";
import { useFeedback } from "../context/feedbackContext";
import { CATEGORY_OPTIONS, TYPE_OPTIONS, validateFeedback } from "../utils/validation";

const INITIAL_FORM = {
  type: "",
  category: "",
  title: "",
  message: "",
};

const TYPE_META = {
  suggestion: {
    label: "Öneri",
    description: "Bir fikrim var",
    icon: Lightbulb,
  },
  issue: {
    label: "Sorun",
    description: "Bir şey yolunda değildi",
    icon: Wrench,
  },
  thanks: {
    label: "Teşekkür",
    description: "Güzel bir anı paylaşayım",
    icon: Heart,
  },
};

const CATEGORY_META = {
  menu: { label: "Menü", icon: UtensilsCrossed },
  service: { label: "Hizmet", icon: UsersRound },
  atmosphere: { label: "Atmosfer", icon: Sparkles },
  other: { label: "Diğer", icon: MessageSquareText },
};

function optionValue(option) {
  return typeof option === "string" ? option : option.value;
}

function normalizeValidation(result) {
  if (!result) return {};
  if (result.errors && typeof result.errors === "object") return result.errors;
  return result;
}

function CharacterCount({ current, max }) {
  const nearLimit = current >= max * 0.85;

  return (
    <span className={nearLimit ? "font-semibold text-[#9b4f28]" : "text-[#8a7a70]"} aria-live="polite">
      {current}/{max}
    </span>
  );
}
function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-[#a33a2b]">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
export function CustomerFeedbackPage() {
  const {
    createFeedback,
    failNext,
    operationLoading,
    isDemo,
    showDemoTools,
  } = useFeedback();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [failureArmed, setFailureArmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const errorSummaryRef = useRef(null);
  const submissionAttemptRef = useRef(null);

  const isSubmitting = Boolean(operationLoading?.create);
  const typeValues = useMemo(() => TYPE_OPTIONS.map(optionValue), []);
  const categoryValues = useMemo(() => CATEGORY_OPTIONS.map(optionValue), []);

  function setField(field, value) {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setSubmitError("");

    if (touched[field]) {
      const nextErrors = normalizeValidation(validateFeedback(nextForm));
      setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
    }
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    const nextErrors = normalizeValidation(validateFeedback(form));
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    const nextErrors = normalizeValidation(validateFeedback(form));
    const hasErrors = Object.values(nextErrors).some(Boolean);

    if (hasErrors) {
      setErrors(nextErrors);
      setTouched({ type: true, category: true, title: true, message: true });
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    const normalizedFeedback = {
      ...form,
      title: form.title.trim(),
      message: form.message.trim(),
    };

    if (!isDemo && !turnstileToken) {
      setSubmitError("Güvenlik doğrulamasını tamamlayın.");
      return;
    }

    const fingerprint = JSON.stringify(normalizedFeedback);
    if (!submissionAttemptRef.current || submissionAttemptRef.current.fingerprint !== fingerprint) {
      submissionAttemptRef.current = {
        fingerprint,
        idempotencyKey: globalThis.crypto.randomUUID(),
      };
    }

    try {
      const created = await createFeedback(
        normalizedFeedback,
        isDemo
          ? undefined
          : {
              turnstileToken,
              idempotencyKey: submissionAttemptRef.current.idempotencyKey,
            },
      );
      setFailureArmed(false);
      setSubmittedFeedback(created ?? { title: form.title.trim() });
    } catch (error) {
      setFailureArmed(false);
      setSubmitError(error instanceof Error ? error.message : "Gönderim tamamlanamadı. Lütfen yeniden deneyin.");
    } finally {
      if (!isDemo) {
        setTurnstileToken("");
        setTurnstileResetSignal((current) => current + 1);
      }
    }
  }

  function startNewFeedback() {
    setForm(INITIAL_FORM);
    setErrors({});
    setTouched({});
    setSubmitError("");
    setSubmittedFeedback(null);
    setFailureArmed(false);
    setTurnstileToken("");
    setTurnstileResetSignal((current) => current + 1);
    submissionAttemptRef.current = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function armFailure() {
    failNext("create");
    setFailureArmed(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f0e6] text-[#281b16]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
        <header className="flex items-center justify-between gap-4 border-b border-[#d8cfc1] pb-4">
          <div className="sm:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden sm:block">
            <BrandMark />
          </div>
          <Link
            to="/yonetici/giris"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c8bcae] bg-[#fffdf8]/70 px-4 text-sm font-bold text-[#4d3d35] transition hover:border-[#0e5c50] hover:text-[#0e5c50] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/20"
          >
            Yönetici girişi
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        <div className="grid flex-1 items-start gap-6 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)] lg:gap-10 lg:py-8 xl:gap-14">
          <section className="relative lg:sticky lg:top-6 lg:pt-3" aria-labelledby="customer-page-title">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.19em] text-[#a95129]">
              <span className="h-px w-8 bg-[#b76432]" aria-hidden="true" />
              Birkaç dakikan yeter
            </p>
            <h1
              id="customer-page-title"
              className="max-w-[15ch] font-serif text-[clamp(2.2rem,4vw,3.9rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#281b16]"
            >
              Bir sonraki güzel fikrimiz senden gelsin.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-6 text-[#68584f] sm:text-lg sm:leading-7">
              <span className="sm:hidden">
                Önerini, sorununu veya teşekkürünü birkaç adımda bizimle paylaş.
              </span>
              <span className="hidden sm:inline">
                Önerini, yaşadığın bir sorunu ya da içinden gelen bir teşekkürü bizimle paylaş. Her not,
                kafenin daha iyi bir hâline dönüşmesine yardım eder.
              </span>
            </p>

            <div
              className={`mt-5 flex max-w-xl items-start gap-3 rounded-2xl border p-3.5 text-sm leading-6 ${
                isDemo
                  ? "border-[#e4c7a9] bg-[#fff6e9] text-[#744c32]"
                  : "border-[#c9d8d1] bg-[#edf5f1] text-[#315f56]"
              }`}
            >
              {isDemo ? (
                <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              )}
              <p>
                {isDemo ? (
                  <>
                    <strong>Bu bir demo önizlemesidir.</strong> Gerçek veya kişisel bilgi girmeyin;
                    kayıtlar yalnızca bu tarayıcı sekmesinin belleğinde tutulur.
                  </>
                ) : (
                  <>
                    İsim, e-posta veya telefon istemiyoruz. Paylaştığınız geri bildirim yalnızca
                    yetkili işletme yöneticisi tarafından görülebilir.
                  </>
                )}
              </p>
            </div>

            <div className="relative mt-7 hidden min-h-44 overflow-hidden rounded-[2rem] border border-[#d7c9b8] bg-[#eee4d5] lg:block" aria-hidden="true">
              <div className="absolute -bottom-16 -left-10 size-48 rounded-full border-[24px] border-[#e1d2bf]" />
              <img
                src="/assets/fincan-arasi-cafe-illustration.png"
                alt=""
                className="absolute bottom-0 left-3 h-[94%] w-[66%] object-contain object-bottom"
              />
              <div className="absolute right-6 top-7 w-44 rotate-2 rounded-[1.6rem_1.6rem_1.6rem_0.4rem] bg-[#0e5c50] p-5 text-[#f9f5ec] shadow-xl shadow-[#0e5c50]/10">
                <Leaf className="size-7" strokeWidth={1.6} />
                <span className="mt-4 block font-serif text-xl leading-tight">Fikrin masada yerini alsın.</span>
              </div>
            </div>

          </section>

          <section className="min-w-0" aria-label="Geri bildirim formu">
            {isDemo ? <DemoBanner compact className="mb-3" /> : null}
            <div className="rounded-[1.6rem] border border-[#d8cfc1] bg-[#fffdf8] p-4 shadow-[0_24px_70px_rgba(62,43,31,0.08)] sm:p-6 lg:p-7">
              {submittedFeedback ? (
                <div className="flex min-h-[30rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
                  <span className="grid size-20 place-items-center rounded-full bg-[#e4f1eb] text-[#0e5c50]">
                    <CheckCircle2 className="size-10" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-[#a95129]">Notun masamıza ulaştı</p>
                  <h2 className="mt-3 max-w-md font-serif text-4xl font-semibold tracking-[-0.035em] text-[#281b16]">
                    Paylaştığın için teşekkür ederiz.
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-7 text-[#6f6058]">
                    {isDemo
                      ? "Gerçek kayıt oluşturulmadı; geri bildirimin bu sekmedeki demo belleğine eklendi."
                      : "Geri bildirimin güvenli biçimde alındı. İçeriğin yalnızca yetkili işletme yöneticisine açıktır."}
                  </p>
                  <button
                    type="button"
                    onClick={startNewFeedback}
                    className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0e5c50] px-6 font-bold text-white shadow-lg shadow-[#0e5c50]/15 transition hover:bg-[#09493f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/25"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Yeni geri bildirim oluştur
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
                  <div className="flex items-start justify-between gap-4 border-b border-[#e1d9ce] pb-5">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#0e5c50]">Geri bildirim formu</p>
                      <h2 className="mt-1 font-serif text-[1.7rem] font-semibold tracking-[-0.03em]">Seni dinliyoruz.</h2>
                    </div>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f4e6d9] text-[#a95129]" aria-hidden="true">
                      <MessageSquareText className="size-5" />
                    </span>
                  </div>

                  {Object.values(errors).some(Boolean) && (
                    <div
                      ref={errorSummaryRef}
                      tabIndex={-1}
                      className="mt-4 rounded-2xl border border-[#e5b3aa] bg-[#fff1ee] p-4 text-sm text-[#8e2f22] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a33a2b]/20"
                      role="alert"
                    >
                      <p className="flex items-center gap-2 font-bold">
                        <AlertCircle className="size-4" aria-hidden="true" />
                        Formu göndermeden önce işaretli alanları kontrol et.
                      </p>
                    </div>
                  )}

                  <fieldset className="mt-5" aria-describedby={errors.type ? "type-error" : undefined}>
                    <legend className="text-sm font-bold text-[#392a23]">Ne paylaşmak istersin?</legend>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {typeValues.map((value) => {
                        const meta = TYPE_META[value] ?? { label: value, description: "", icon: MessageSquareText };
                        const Icon = meta.icon;
                        const selected = form.type === value;
                        return (
                          <label
                            key={value}
                            className={`group relative flex min-h-[5.75rem] cursor-pointer flex-col rounded-xl border p-3 transition focus-within:ring-4 focus-within:ring-[#0e5c50]/20 ${value === "thanks" ? "col-span-2 sm:col-span-1" : ""} ${
                              selected
                                ? "border-[#0e5c50] bg-[#edf5f1] shadow-[inset_0_0_0_1px_#0e5c50] ring-1 ring-[#0e5c50]/20"
                                : "border-[#d8cfc1] bg-white hover:border-[#9fafaa] hover:bg-[#faf8f2]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="type"
                              value={value}
                              checked={selected}
                              onChange={(event) => setField("type", event.target.value)}
                              onBlur={() => handleBlur("type")}
                              className="sr-only"
                            />
                            <span className="flex items-center justify-between gap-2">
                              <Icon className={`size-5 ${selected ? "text-[#0e5c50]" : "text-[#8a6a57]"}`} aria-hidden="true" />
                              {selected && <Check className="size-4 text-[#0e5c50]" aria-hidden="true" />}
                            </span>
                            <span className="mt-2.5 text-sm font-extrabold text-[#35271f]">{meta.label}</span>
                            <span className="mt-1 text-xs leading-4 text-[#7c6c62]">{meta.description}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FieldError id="type-error">{errors.type}</FieldError>
                  </fieldset>

                  <fieldset className="mt-5" aria-describedby={errors.category ? "category-error" : undefined}>
                    <legend className="text-sm font-bold text-[#392a23]">Hangi konuyla ilgili?</legend>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {categoryValues.map((value) => {
                        const meta = CATEGORY_META[value] ?? { label: value, icon: MessageSquareText };
                        const Icon = meta.icon;
                        const selected = form.category === value;
                        return (
                          <label
                            key={value}
                            className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition focus-within:ring-4 focus-within:ring-[#0e5c50]/20 ${
                              selected
                                ? "border-[#0e5c50] bg-[#0e5c50] text-white"
                                : "border-[#d8cfc1] bg-white text-[#5d4d44] hover:border-[#92aaa3]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="category"
                              value={value}
                              checked={selected}
                              onChange={(event) => setField("category", event.target.value)}
                              onBlur={() => handleBlur("category")}
                              className="sr-only"
                            />
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span>{meta.label}</span>
                            {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                          </label>
                        );
                      })}
                    </div>
                    <FieldError id="category-error">{errors.category}</FieldError>
                  </fieldset>

                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-4">
                      <label htmlFor="feedback-title" className="text-sm font-bold text-[#392a23]">
                        Kısaca başlığın
                      </label>
                      <span className="text-xs">
                        <CharacterCount current={form.title.length} max={100} />
                      </span>
                    </div>
                    <input
                      id="feedback-title"
                      name="title"
                      type="text"
                      value={form.title}
                      maxLength={100}
                      onChange={(event) => setField("title", event.target.value)}
                      onBlur={() => handleBlur("title")}
                      aria-invalid={Boolean(errors.title)}
                      aria-describedby={errors.title ? "title-error" : "title-hint"}
                      placeholder="Örn. Akşam menüsüne bitki çayı seçeneği"
                      className="mt-2 min-h-12 w-full rounded-xl border border-[#cec3b5] bg-white px-4 text-base text-[#281b16] outline-none transition placeholder:text-[#a79990] hover:border-[#9ca9a5] focus:border-[#0e5c50] focus:ring-4 focus:ring-[#0e5c50]/15 aria-[invalid=true]:border-[#a33a2b] aria-[invalid=true]:ring-[#a33a2b]/10"
                    />
                    {!errors.title && (
                      <p id="title-hint" className="mt-1.5 text-xs text-[#8a7a70]">
                        En az 5 karakter.
                      </p>
                    )}
                    <FieldError id="title-error">{errors.title}</FieldError>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-4">
                      <label htmlFor="feedback-message" className="text-sm font-bold text-[#392a23]">
                        Biraz daha anlatır mısın?
                      </label>
                      <span className="text-xs">
                        <CharacterCount current={form.message.length} max={2000} />
                      </span>
                    </div>
                    <textarea
                      id="feedback-message"
                      name="message"
                      value={form.message}
                      maxLength={2000}
                      rows={5}
                      onChange={(event) => setField("message", event.target.value)}
                      onBlur={() => handleBlur("message")}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "message-error" : "message-hint"}
                      placeholder="Deneyimini ya da fikrini kendi kelimelerinle paylaşabilirsin."
                      className="mt-2 h-[150px] min-h-[150px] w-full resize-y rounded-xl border border-[#cec3b5] bg-white px-4 py-3 text-base leading-7 text-[#281b16] outline-none transition placeholder:text-[#a79990] hover:border-[#9ca9a5] focus:border-[#0e5c50] focus:ring-4 focus:ring-[#0e5c50]/15 aria-[invalid=true]:border-[#a33a2b] aria-[invalid=true]:ring-[#a33a2b]/10"
                    />
                    {!errors.message && (
                      <p id="message-hint" className="mt-1.5 text-xs text-[#8a7a70]">
                        En az 10 karakter; kişisel bilgi eklememeni öneririz.
                      </p>
                    )}
                    <FieldError id="message-error">{errors.message}</FieldError>
                  </div>

                  {submitError && (
                    <div className="mt-5 rounded-2xl border border-[#e5b3aa] bg-[#fff1ee] p-4 text-sm text-[#8e2f22]" role="alert">
                      <p className="flex items-start gap-2 font-semibold">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>{submitError}</span>
                      </p>
                      <p className="ml-6 mt-1 text-[#9f4a3e]">Yazdıkların korunuyor; yeniden deneyebilirsin.</p>
                    </div>
                  )}

                  {!isDemo ? (
                    <div className="mt-5 rounded-xl border border-[#d8cfc1] bg-white p-3">
                      <TurnstileWidget
                        key={turnstileResetSignal}
                        siteKey={appConfig.turnstileSiteKey}
                        onTokenChange={setTurnstileToken}
                      />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e5c50] px-5 py-3 font-extrabold text-white shadow-[0_12px_24px_rgba(14,92,80,0.18)] transition hover:bg-[#09493f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e5c50]/25 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Gönderiliyor…
                      </>
                    ) : (
                      <>
                        Geri bildirimimi gönder
                        <ArrowRight className="size-5" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {showDemoTools ? (
                    <details className="mt-5 border-t border-dashed border-[#ddd2c5] pt-4 text-sm text-[#78675d]">
                      <summary className="cursor-pointer select-none font-bold text-[#715646] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b76432]/15">
                        Demo test araçları
                      </summary>
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#faf4e9] p-3">
                        <button
                          type="button"
                          onClick={armFailure}
                          disabled={failureArmed || isSubmitting}
                          className="min-h-11 rounded-lg border border-[#cda681] bg-white px-3 font-bold text-[#8a4929] transition hover:bg-[#fff8ef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b76432]/20 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {failureArmed ? "Hata senaryosu hazır" : "Sonraki gönderimde hatayı dene"}
                        </button>
                        <span className="text-xs leading-5 text-[#887166]">Rastgele hata üretmez; yalnızca bir sonraki demo çağrısını etkiler.</span>
                      </div>
                    </details>
                  ) : null}
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
