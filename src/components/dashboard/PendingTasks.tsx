import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, EmptyState, SectionHeader } from '../ui';
import type { TaskLite } from '../../types';

export default function PendingTasks({ pending }: { pending: TaskLite[] }) {
  const visible = pending.slice(0, 2);
  const blockedCount = pending.filter((task) => task.status === 'blocked').length;

  return (
    <Card className="p-4">
      <SectionHeader
        title="Pending Tasks"
        subtitle="Yang perlu perhatian"
        aside={
          <>
            <span
              className={`rounded-full px-2 py-1 text-[9.5px] font-bold ${
                blockedCount > 0 ? 'bg-coralSoft text-[#b84a2b] dark:text-orange-200' : 'bg-soft text-muted'
              }`}
            >
              {pending.length}
            </span>
            <a
              href="#/tasks"
              aria-label="Lihat semua tugas"
              title="Lihat semua tugas"
              className="grid h-8 w-8 place-items-center rounded-[10px] bg-soft text-muted transition-colors hover:bg-brandSoft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ChevronRight size={15} aria-hidden />
            </a>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Tidak ada tugas tertunda">
          Semua tugas saat ini sudah terkelola.
        </EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((task) => (
            <li key={task.id} className="flex items-center gap-2.5 rounded-[12px] bg-soft2 px-2.5 py-1.5">
              <span
                className={`grid h-6 w-6 flex-none place-items-center rounded-full ${
                  task.status === 'blocked'
                    ? 'bg-coralSoft text-[#b84a2b] dark:text-orange-200'
                    : 'bg-sunSoft text-[#8a6410] dark:text-amber-200'
                }`}
              >
                <AlertCircle size={12} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[11.5px] font-semibold leading-snug text-ink" title={task.title}>
                  {task.title}
                </p>
                <p
                  className="mt-0.5 break-words text-[9.5px] font-medium leading-snug text-muted"
                  title={`${task.project} — ${
                    task.status === 'blocked'
                      ? task.blocked_reason ?? 'terhambat'
                      : task.next_step ?? 'langkah berikut belum dicatat'
                  }`}
                >
                  {task.status === 'blocked'
                    ? `Terhambat: ${task.blocked_reason ?? 'alasan belum dicatat'}`
                    : `Berikutnya: ${task.next_step ?? 'belum ditentukan'}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 2 ? (
        <p className="mt-1.5 text-right text-[10px] font-medium text-muted">
          +{pending.length - 2} tugas lainnya
        </p>
      ) : null}
    </Card>
  );
}
