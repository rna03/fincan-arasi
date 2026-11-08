import { useEffect, useRef } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Sil",
  cancelLabel = "Vazgeç",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-espresso-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="w-full max-w-md rounded-[1.4rem] border border-copper-200 bg-cream-50 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-700">
            <AlertTriangle aria-hidden="true" size={21} />
          </span>
          <button
            type="button"
            className="icon-button -mr-2 -mt-2"
            onClick={onClose}
            disabled={busy}
            aria-label="Onay penceresini kapat"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <h2 id="confirm-title" className="mt-4 font-display text-2xl text-espresso-950">
          {title}
        </h2>
        <p id="confirm-description" className="mt-2 text-sm leading-6 text-espresso-700">
          {description}
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
            {busy ? "Siliniyor…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
