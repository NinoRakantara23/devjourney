import { CalendarDays, Flag, Target } from 'lucide-react';
import { Card, EmptyState, SectionHeader } from '../ui';
import type { Milestone } from '../../types';

function formatTarget(date: string | null) {
  if (!date) return 'Tanpa target';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(parsed);
}

export default function Milestones({ milestones }: { milestones: Milestone[] }) {
  const visible = milestones.slice(0, 2);

  return (
    <Card className="p-4">
      <SectionHeader
        title="Milestones"
        subtitle="Target terdekat"
        aside={
          <a
            href="#/milestone"
            aria-label="Lihat semua milestone"
            title="Lihat semua milestone"
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-brandSoft text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Target size={15} aria-hidden />
          </a>
        }
      />

      {visible.length === 0 ? (
        <EmptyState icon={Target} title="Belum ada milestone">
          Target terdekat akan tampil di sini.
        </EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-center gap-2 rounded-[12px] border border-line bg-card px-2.5 py-1.5"
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brandSoft text-brand">
                <Flag size={11} aria-hidden />
              </span>
              <p
                className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-snug text-ink"
                title={`${milestone.title} — ${milestone.project}`}
              >
                {milestone.title}
              </p>
              <span
                className="flex flex-none items-center gap-1 rounded-full bg-soft px-2 py-1 text-[9px] font-bold text-muted"
                title={milestone.target_date ?? 'Target belum ditetapkan'}
              >
                <CalendarDays size={10} aria-hidden /> {formatTarget(milestone.target_date)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {milestones.length > 2 ? (
        <p className="mt-2 text-right text-[10px] font-medium text-muted">
          +{milestones.length - 2} milestone lainnya
        </p>
      ) : null}
    </Card>
  );
}
