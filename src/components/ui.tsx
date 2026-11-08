import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { MilestoneStatus, Priority, SkillStatus, StageStatus, Status } from '../types';

export type Tone = 'brand' | 'sun' | 'coral' | 'aqua' | 'neutral';
export type BadgeStatus =
  | Status
  | StageStatus
  | MilestoneStatus
  | SkillStatus
  | 'active'
  | 'paused'
  | 'completed';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-[20px] border border-line bg-card p-4 shadow-cardLift ${className}`}>
    {children}
  </section>
);

export const SectionHeader = ({
  id,
  title,
  subtitle,
  aside,
  className = '',
}: {
  id?: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  className?: string;
}) => (
  <div className={`mb-2.5 flex items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h2 id={id} className="text-[18px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[10.5px] font-medium text-muted">{subtitle}</p> : null}
    </div>
    {aside ? <div className="flex flex-none items-center gap-2">{aside}</div> : null}
  </div>
);

export const EmptyState = ({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`rounded-2xl border border-dashed border-line bg-soft2 px-4 py-5 text-center ${className}`}>
    {Icon ? (
      <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-card text-muted">
        <Icon size={16} aria-hidden />
      </span>
    ) : null}
    {title ? <p className="text-[12px] font-semibold text-ink">{title}</p> : null}
    <p className="mt-1 text-[11px] leading-relaxed text-muted">{children}</p>
  </div>
);

export const ProgressBar = ({
  value,
  className = '',
  trackClassName = 'bg-soft',
  barClassName = 'bg-brand',
  label,
}: {
  value: number | null;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  label?: string;
}) => {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : pct}
      aria-valuetext={value === null ? 'Belum ada tugas' : `${pct}%`}
      className={`h-1.5 w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
    >
      <span
        className={`block h-full rounded-full transition-[width] duration-500 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const statusMeta: Record<BadgeStatus, { label: string; tone: Tone }> = {
  in_progress: { label: 'In Progress', tone: 'brand' },
  todo: { label: 'To Do', tone: 'aqua' },
  blocked: { label: 'Blocked', tone: 'coral' },
  done: { label: 'Completed', tone: 'sun' },
  planned: { label: 'Planned', tone: 'neutral' },
  reached: { label: 'Reached', tone: 'aqua' },
  not_started: { label: 'Not started', tone: 'neutral' },
  learning: { label: 'Learning', tone: 'brand' },
  practicing: { label: 'Practicing', tone: 'sun' },
  active: { label: 'Active', tone: 'brand' },
  paused: { label: 'Paused', tone: 'sun' },
  completed: { label: 'Completed', tone: 'aqua' },
};

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brandSoft text-brand dark:text-violet-200',
  sun: 'bg-sunSoft text-[#8a6410] dark:text-amber-200',
  coral: 'bg-coralSoft text-[#b84a2b] dark:text-orange-200',
  aqua: 'bg-aquaSoft text-[#0e6b7b] dark:text-cyan-200',
  neutral: 'bg-soft text-muted',
};

const priorityMeta: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-soft text-muted' },
  medium: { label: 'Medium', className: 'bg-aquaSoft text-[#0e6b7b] dark:text-cyan-200' },
  high: { label: 'High', className: 'bg-sunSoft text-[#8a6410] dark:text-amber-200' },
  critical: { label: 'Critical', className: 'bg-coralSoft text-[#b84a2b] dark:text-orange-200' },
};

export const PriorityBadge = ({
  priority,
  className = '',
}: {
  priority: Priority;
  className?: string;
}) => {
  const meta = priorityMeta[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
};

export const StatusBadge = ({
  status,
  label,
  className = '',
}: {
  status: BadgeStatus;
  label?: string;
  className?: string;
}) => {
  const meta = statusMeta[status] ?? { label: status, tone: 'neutral' as Tone };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${toneClasses[meta.tone]} ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
      {label ?? meta.label}
    </span>
  );
};
