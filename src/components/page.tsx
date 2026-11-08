import type { ReactNode } from "react";
import {
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  ServerOff,
  type LucideIcon,
} from "lucide-react";
import { Card } from "./ui";

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-line bg-card p-5 shadow-cardLift sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-[16px] bg-brandSoft text-brand">
          <Icon size={22} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted">
            DevJourney
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-[27px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[31px]">
              {title}
            </h1>
            {badge}
          </div>
          <p className="mt-2 max-w-[680px] text-[12px] leading-relaxed text-muted">
            {description}
          </p>
        </div>
        {children ? (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PageLoading({ label = "Memuat data..." }: { label?: string }) {
  return (
    <Card className="flex min-h-[220px] items-center justify-center">
      <span
        className="flex items-center gap-2 text-[12px] font-medium text-muted"
        role="status"
        aria-live="polite"
      >
        <Loader2 size={18} className="animate-spin" aria-hidden /> {label}
      </span>
    </Card>
  );
}

export function PageError({
  title = "Data belum dapat dimuat",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-coral/40">
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        role="alert"
      >
        <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-coralSoft text-[#b84a2b] dark:text-orange-200">
          <ServerOff size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-bold text-ink">{title}</h2>
          <p className="mt-1 break-words text-[11.5px] leading-relaxed text-muted">
            {message}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            Periksa Apache/MySQL dan pastikan endpoint{" "}
            <code className="font-mono">/devjourney/api</code> dapat diakses.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex flex-none items-center justify-center gap-1.5 rounded-[10px] bg-brand px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-brandDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <RefreshCw size={13} aria-hidden /> Coba lagi
        </button>
      </div>
    </Card>
  );
}

const noticeTone = {
  info: {
    wrap: "border-line bg-soft2",
    icon: "bg-brandSoft text-brand",
    Icon: Info,
  },
  warning: {
    wrap: "border-[#f4dfae] bg-[#fffaf0] dark:border-[#5b4a28] dark:bg-[#2d271d]",
    icon: "bg-sunSoft text-[#8a6410] dark:text-amber-200",
    Icon: AlertTriangle,
  },
  error: {
    wrap: "border-coral/40 bg-coralSoft/45 dark:bg-[#33231e]",
    icon: "bg-coralSoft text-[#b84a2b] dark:text-orange-200",
    Icon: AlertTriangle,
  },
} as const;

export function ApiNotice({
  title,
  children,
  tone = "info",
  action,
}: {
  title: string;
  children: ReactNode;
  tone?: keyof typeof noticeTone;
  action?: ReactNode;
}) {
  const meta = noticeTone[tone];
  const Icon = meta.Icon;

  return (
    <div className={`rounded-[18px] border p-3.5 ${meta.wrap}`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] ${meta.icon}`}
        >
          <Icon size={15} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold text-ink">{title}</p>
          <div className="mt-1 text-[11px] leading-relaxed text-muted">
            {children}
          </div>
        </div>
        {action ? (
          <div className="flex flex-none items-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "brand" | "sun" | "coral" | "aqua" | "neutral";
}) {
  const tones = {
    brand: "bg-brandSoft text-brand dark:text-violet-200",
    sun: "bg-sunSoft text-[#8a6410] dark:text-amber-200",
    coral: "bg-coralSoft text-[#b84a2b] dark:text-orange-200",
    aqua: "bg-aquaSoft text-[#0e6b7b] dark:text-cyan-200",
    neutral: "bg-soft text-muted",
  } as const;

  return (
    <div className="rounded-[16px] border border-line bg-card p-3.5 shadow-cardLift">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
        {Icon ? (
          <span
            className={`grid h-7 w-7 place-items-center rounded-full ${tones[tone]}`}
          >
            <Icon size={13} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-ink">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] leading-snug text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
