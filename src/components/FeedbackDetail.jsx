import { useMemo, useState } from "react";
import {
  ArchiveX,
  Check,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  Save,
  ShieldCheck,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
} from "../utils/validation";
import { getHistoryActorLabel } from "../utils/feedbackHistory";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

export function FeedbackDetail({
  feedback,
  onUpdate,
  onDelete,
  onCloseMobile,
  updateBusy,
  deleteBusy,
  failNext,
  showDemoTools,
}) {
  const [status, setStatus] = useState(feedback.status);
  const [adminNote, setAdminNote] = useState(feedback.admin_note || "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasChanges = useMemo(
    () => status !== feedback.status || adminNote !== (feedback.admin_note || ""),
    [adminNote, feedback.admin_note, feedback.status, status],
  );

  const handleSave = async () => {
    setSaveMessage("");
    setSaveError("");
    try {
      await onUpdate(feedback.id, { status, admin_note: adminNote });
      setSaveMessage("Değişiklikler kaydedildi.");
    } catch (error) {
      setSaveError(error.message || "Değişiklikler kaydedilemedi.");
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    try {
      await onDelete(feedback.id);
      setDeleteOpen(false);
    } catch (error) {
      setDeleteError(error.message || "Kayıt silinemedi.");
    }
  };

  return (
    <>
      <article className="flex min-h-0 flex-1 flex-col bg-cream-50 lg:rounded-2xl lg:border lg:border-line-200 lg:shadow-soft">
        <header className="border-b border-line-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="button-ghost -ml-2 lg:hidden"
              onClick={onCloseMobile}
            >
              <ChevronLeft aria-hidden="true" size={18} />
              Listeye dön
            </button>
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-petrol-700 lg:block">
              Geri bildirim detayı
            </p>
            <span className={`status-badge status-${feedback.status}`}>
              {STATUS_LABELS[feedback.status]}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-espresso-600">
            <span className="tag">{TYPE_LABELS[feedback.type]}</span>
            <span className="tag">{CATEGORY_LABELS[feedback.category]}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={14} />
              {formatDate(feedback.created_at)}
            </span>
          </div>

          <h2 className="mt-4 font-display text-[1.65rem] leading-tight text-espresso-950">
            {feedback.title}
          </h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-espresso-800">
            {feedback.message}
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-petrol-100 bg-petrol-50/70 p-3 text-sm text-petrol-900">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <p>
              Başlık ve açıklama müşterinin özgün metnidir; yönetici tarafından
              değiştirilemez.
            </p>
          </div>

          <section className="mt-7 border-t border-line-200 pt-6" aria-labelledby="review-heading">
            <h3 id="review-heading" className="font-display text-xl text-espresso-950">
              İç değerlendirme
            </h3>
            <div className="mt-4 grid gap-4">
              <label className="field-label" htmlFor={`status-${feedback.id}`}>
                Durum
                <select
                  id={`status-${feedback.id}`}
                  className="field-control mt-2"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setSaveMessage("");
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label" htmlFor={`note-${feedback.id}`}>
                İç not
                <textarea
                  id={`note-${feedback.id}`}
                  className="field-control mt-2 min-h-28 resize-y"
                  maxLength={2000}
                  value={adminNote}
                  onChange={(event) => {
                    setAdminNote(event.target.value);
                    setSaveMessage("");
                  }}
                  placeholder="Yalnızca işletme ekibinin göreceği kısa not…"
                />
                <span className="mt-1.5 block text-right text-xs font-normal text-espresso-500">
                  {adminNote.length}/2000
                </span>
              </label>
            </div>

            <div aria-live="polite" className="mt-2 min-h-6 text-sm">
              {saveMessage ? (
                <p className="inline-flex items-center gap-1.5 text-petrol-700">
                  <Check aria-hidden="true" size={16} /> {saveMessage}
                </p>
              ) : null}
              {saveError ? <p role="alert" className="text-danger-700">{saveError}</p> : null}
            </div>

            <button
              type="button"
              className="button-primary mt-2 w-full justify-center"
              onClick={handleSave}
              disabled={!hasChanges || updateBusy || adminNote.length > 2000}
            >
              {updateBusy ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <Save aria-hidden="true" size={17} />
              )}
              {updateBusy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
          </section>

          <section className="mt-8 border-t border-line-200 pt-6" aria-labelledby="history-heading">
            <h3 id="history-heading" className="font-display text-xl text-espresso-950">
              Durum geçmişi
            </h3>
            {feedback.history?.length ? (
              <ol className="mt-4 space-y-0">
                {[...feedback.history].reverse().map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < feedback.history.length - 1 ? (
                      <span aria-hidden="true" className="absolute left-[7px] top-4 h-full w-px bg-line-300" />
                    ) : null}
                    <span aria-hidden="true" className="relative mt-1.5 size-[15px] shrink-0 rounded-full border-[4px] border-cream-50 bg-copper-500 ring-1 ring-copper-300" />
                    <div>
                      <p className="text-sm font-semibold text-espresso-800">
                        {entry.previous_status
                          ? `${STATUS_LABELS[entry.previous_status]} → ${STATUS_LABELS[entry.new_status]}`
                          : STATUS_LABELS[entry.new_status]}
                      </p>
                      <p className="mt-0.5 text-xs text-espresso-500">
                        {formatDate(entry.created_at)} · {getHistoryActorLabel(entry)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-espresso-500">Henüz durum değişikliği yok.</p>
            )}
          </section>

          {showDemoTools ? (
            <details className="mt-8 rounded-xl border border-dashed border-line-300 bg-cream-100/60 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-espresso-700">
                Demo işlem hatalarını dene
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="button-small" onClick={() => failNext("update")}>
                  Sonraki kaydı başarısız yap
                </button>
                <button type="button" className="button-small" onClick={() => failNext("delete")}>
                  Sonraki silmeyi başarısız yap
                </button>
              </div>
            </details>
          ) : null}

          <div className="mt-8 border-t border-line-200 pt-6">
            <button
              type="button"
              className="button-danger-outline w-full justify-center"
              onClick={() => setDeleteOpen(true)}
            >
              <ArchiveX aria-hidden="true" size={17} />
              Kaydı sil
            </button>
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={deleteOpen}
        title="Bu geri bildirimi sil?"
        description={`“${feedback.title}” kaydı ve ona bağlı durum geçmişi kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteBusy) {
            setDeleteOpen(false);
            setDeleteError("");
          }
        }}
      />
    </>
  );
}
