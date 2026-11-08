export function BrandMark({ compact = false, inverse = false, className = "" }) {
  const textTone = inverse ? "text-[#fffaf0]" : "text-[#281b16]";
  const mutedTone = inverse ? "text-[#d9e7e1]" : "text-[#6f6058]";

  return (
    <div
      className={`inline-flex min-w-0 items-center gap-2.5 sm:gap-3 ${className}`}
      role="img"
      aria-label="Fincan Arası, kafenin fikir köşesi"
    >
      <img
        src="/assets/fincan-arasi-mark.png"
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-contain ${compact ? "h-11 w-12" : "h-14 w-[3.8rem]"}`}
      />
      <span className="min-w-0">
        <span
          className={`block whitespace-nowrap font-serif font-semibold tracking-[-0.025em] ${textTone} ${
            compact ? "text-xl" : "text-2xl"
          }`}
        >
          Fincan Arası
        </span>
        {!compact && (
          <span className={`mt-0.5 block text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${mutedTone}`}>
            Kafenin fikir köşesi
          </span>
        )}
      </span>
    </div>
  );
}
