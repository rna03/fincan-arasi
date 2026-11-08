import { FlaskConical } from "lucide-react";

export function DemoBanner({ compact = false, className = "" }) {
  return (
    <div
      className={`flex items-start gap-2.5 border border-[#d5c5ad] bg-[#fff8ea] text-[#68472f] ${
        compact ? "rounded-xl px-3 py-2 text-xs" : "rounded-2xl px-4 py-3 text-sm"
      } ${className}`}
      role="status"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-[#a95129]" aria-hidden="true" />
      <p>
        <strong className="font-bold">Demo — gerçek gönderim yapılmaz.</strong>{" "}
        <span className="text-[#80654f]">Veriler bu sekmede tutulur ve sayfa yenilenince sıfırlanır.</span>
      </p>
    </div>
  );
}
