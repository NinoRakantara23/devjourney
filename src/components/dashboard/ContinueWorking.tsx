import { useState } from 'react';
import { ArrowRight, FolderKanban, Play } from 'lucide-react';
import { Card, EmptyState, StatusBadge } from '../ui';
import type { Project, TaskLite } from '../../types';

function ProjectDial({ pct, projectName }: { pct: number | null; projectName?: string }) {
  const value = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const ticks = Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 40) * Math.PI * 2 - Math.PI / 2;
    const isMajor = index % 5 === 0;
    const inner = isMajor ? 86 : 89;
    return {
      x1: 100 + Math.cos(angle) * inner,
      y1: 100 + Math.sin(angle) * inner,
      x2: 100 + Math.cos(angle) * 94,
      y2: 100 + Math.sin(angle) * 94,
      active: (index / 40) * 100 <= value,
      isMajor,
    };
  });

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[232px]"
      role="img"
      aria-label={
        pct === null
          ? `${projectName ?? 'Proyek'} belum memiliki progres`
          : `Progres ${projectName ?? 'proyek'} ${pct}%`
      }
    >
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <linearGradient id="project-progress-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c41f5" />
            <stop offset="1" stopColor="#ff9062" />
          </linearGradient>
        </defs>

        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.active ? 'var(--brand)' : 'var(--line)'}
            strokeWidth={tick.isMajor ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}

        <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--soft)" strokeWidth="10" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#project-progress-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
          transform="rotate(-90 100 100)"
        />
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-ink">
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className="mt-1.5 text-[10px] font-semibold text-muted">
          {pct === null ? 'Belum ada tugas' : 'project progress'}
        </span>
      </div>
    </div>
  );
}

export default function ContinueWorking({
  task,
  project,
  preview,
  onResume,
}: {
  task: TaskLite | null;
  project?: Project;
  preview: boolean;
  onResume: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const handleResume = async () => {
    if (preview) {
      setNote('Mode pratinjau: aksi ini membutuhkan data tugas nyata.');
      return;
    }

    setBusy(true);
    setNote('');
    try {
      await onResume();
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Gagal memperbarui tugas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="relative overflow-hidden p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-brandSoft text-brand">
          <Play size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">Continue Working</h2>
          <p className="mt-0.5 text-[10.5px] font-medium text-muted">Pick up where you left off</p>
        </div>
        {task ? <StatusBadge status="in_progress" /> : null}
      </div>

      {task ? (
        <div className="mt-5 grid items-center gap-6 md:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)]">
          <div className="min-w-0">
            <div className="rounded-[16px] bg-soft2 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Current task</p>
              <h3 className="mt-1 text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">
                {task.title}
              </h3>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <FolderKanban size={13} aria-hidden /> {task.project}
              </p>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                  Catatan terakhir
                </dt>
                <dd className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {task.note ?? 'Belum ada catatan.'}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                  Langkah berikutnya
                </dt>
                <dd className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {task.next_step ?? 'Belum ditentukan.'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResume}
                disabled={busy}
                aria-busy={busy}
                className="group inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[11.5px] font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brandDeep disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? 'Resuming...' : 'Resume Work'}
                <ArrowRight
                  size={15}
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
              <a
                href={`#/perjalanan?task=${task.id}`}
                className="inline-flex items-center gap-1 rounded-xl bg-soft px-3 py-2.5 text-[11px] font-bold text-brand transition-colors hover:bg-brandSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Lihat catatan
              </a>
              {preview ? <span className="text-[10px] font-medium text-muted">Preview mode</span> : null}
            </div>

            {note ? (
              <p role="status" className="mt-2 text-[10.5px] font-medium text-coral">
                {note}
              </p>
            ) : null}
          </div>

          <ProjectDial pct={project?.progress ?? null} projectName={project?.name} />
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState icon={Play} title="Belum ada pekerjaan aktif">
            Tandai tugas sebagai In Progress agar muncul di panel ini.
          </EmptyState>
        </div>
      )}
    </Card>
  );
}
