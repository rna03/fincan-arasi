import { AlertCircle, Inbox, LoaderCircle, SearchX } from "lucide-react";

const iconMap = {
  loading: LoaderCircle,
  error: AlertCircle,
  empty: Inbox,
  filtered: SearchX,
};

export function StateView({
  kind = "empty",
  title,
  description,
  action,
  compact = false,
}) {
  const Icon = iconMap[kind] || Inbox;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`grid place-items-center rounded-2xl border border-dashed border-line-300 bg-cream-50/70 px-6 text-center ${compact ? "min-h-48 py-8" : "min-h-80 py-12"}`}
    >
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-petrol-50 text-petrol-700">
          <Icon
            aria-hidden="true"
            size={22}
            className={kind === "loading" ? "animate-spin" : ""}
          />
        </span>
        <h3 className="mt-4 font-display text-xl text-espresso-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-espresso-600">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
