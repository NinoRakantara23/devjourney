import { Ban, CheckCircle2, ListChecks, Loader, type LucideIcon } from 'lucide-react';
import type { Status } from '../../types';

type FocusCard = {
  key: Status;
  label: string;
  tag: string;
  caption: string;
  Icon: LucideIcon;
  iconClass: string;
  active?: boolean;
};

const cards: FocusCard[] = [
  {
    key: 'in_progress',
    label: 'In Progress',
    tag: 'Now',
    caption: 'Sedang dikerjakan',
    Icon: Loader,
    iconClass: 'bg-brandSoft text-brand',
    active: true,
  },
  {
    key: 'todo',
    label: 'To Do',
    tag: 'Next',
    caption: 'Menunggu dikerjakan',
    Icon: ListChecks,
    iconClass: 'bg-aquaSoft text-[#0e6b7b] dark:text-cyan-200',
  },
  {
    key: 'blocked',
    label: 'Blocked',
    tag: 'Stuck',
    caption: 'Perlu perhatian',
    Icon: Ban,
    iconClass: 'bg-coralSoft text-[#b84a2b] dark:text-orange-200',
  },
  {
    key: 'done',
    label: 'Completed',
    tag: 'Done',
    caption: 'Selesai',
    Icon: CheckCircle2,
    iconClass: 'bg-sunSoft text-[#8a6410] dark:text-amber-200',
  },
];

export default function FocusCards({ counts }: { counts: Record<Status, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(({ key, label, tag, caption, Icon, iconClass, active }) => (
        <article
          key={key}
          className={`relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[18px] p-3.5 ${
            active
              ? 'bg-brand text-white shadow-float'
              : 'border border-line bg-card text-ink shadow-cardLift'
          }`}
        >
          {active ? (
            <span aria-hidden className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/10" />
          ) : null}

          <div className="relative flex items-start justify-between gap-2">
            <span
              className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
                active ? 'text-white/85' : 'text-muted'
              }`}
            >
              {tag}
            </span>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full ${
                active ? 'bg-white/15 text-white' : iconClass
              }`}
            >
              <Icon size={15} strokeWidth={2} aria-hidden />
            </span>
          </div>

          <div className="relative mt-3">
            <b className="text-[28px] font-extrabold leading-none tracking-[-0.03em]">{counts[key]}</b>
            <p className={`mt-1 text-[12px] font-bold ${active ? 'text-white' : 'text-ink'}`}>{label}</p>
            <p className={`text-[10px] ${active ? 'text-white/85' : 'text-muted'}`}>{caption}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
