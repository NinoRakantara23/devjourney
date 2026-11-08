import { CalendarDays } from 'lucide-react';
import { updateTask } from '../api';
import { useDashboardData } from '../hooks/useDashboardData';
import { SectionHeader } from '../components/ui';
import { ApiNotice, PageError } from '../components/page';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import FocusCards from '../components/dashboard/FocusCards';
import QuickAdd from '../components/dashboard/QuickAdd';
import ContinueWorking from '../components/dashboard/ContinueWorking';
import ProjectsPanel from '../components/dashboard/ProjectsPanel';
import PendingTasks from '../components/dashboard/PendingTasks';
import Milestones from '../components/dashboard/Milestones';
import WeeklyActivity from '../components/dashboard/WeeklyActivity';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';

export default function Dashboard({ query }: { query: string }) {
  const { data, error, apiReachable, loading, reload } = useDashboardData();

  if (!data && error) {
    return (
      <div className="space-y-4">
        <PageError message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Memuat dashboard...</span>
        <DashboardSkeleton />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (...values: Array<string | null | undefined>) =>
    values.some((value) => (value ?? '').toLowerCase().includes(q));

  const projects = data.projects.filter((project) =>
    matches(project.name, project.description, project.status),
  );
  const pending = data.pending.filter((task) =>
    matches(task.title, task.project, task.blocked_reason, task.next_step),
  );
  const milestones = data.milestones.filter((milestone) =>
    matches(milestone.title, milestone.project),
  );

  const activeProjects = data.projects.filter((project) => project.status === 'active').length;
  const openTasks = data.counts.in_progress + data.counts.todo + data.counts.blocked;
  const focus = data.continue?.title ?? data.pending[0]?.title ?? 'Tentukan satu langkah kecil hari ini';
  const continueProject = data.continue
    ? data.projects.find((project) => project.id === data.continue?.project_id)
    : undefined;

  const resume = async () => {
    if (!data.continue) return;
    await updateTask(data.continue.id, 'in_progress');
    window.location.hash = `#/perjalanan?task=${data.continue.id}`;
  };

  return (
    <div id="dashboard" aria-busy={loading} className="space-y-4">
      {error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-[9px] bg-brand px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-brandDeep"
            >
              Coba lagi
            </button>
          }
        >
          {error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.72fr_minmax(0,1fr)] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <WelcomeBanner
            focus={focus}
            openTasks={openTasks}
            activeProjects={activeProjects}
            preview={false}
            previewNote=""
          />

          <section aria-labelledby="focus-heading">
            <SectionHeader
              id="focus-heading"
              title="Today's Focus"
              subtitle="Ringkasan status tugas"
              aside={
                <>
                  <span className="hidden items-center gap-1 rounded-full bg-soft px-2 py-1 text-[9.5px] font-semibold text-muted sm:inline-flex">
                    <CalendarDays size={12} aria-hidden /> Today
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brandSoft px-2 py-1 text-[9.5px] font-bold text-brand dark:text-violet-200"
                    title="Total tugas yang belum selesai"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> {openTasks} open
                  </span>
                </>
              }
            />

            <FocusCards counts={data.counts} />
            <QuickAdd
              projects={data.projects}
              preview={!apiReachable}
              onDone={async () => {
                await reload();
              }}
            />
          </section>

          <ContinueWorking
            task={data.continue}
            project={continueProject}
            preview={false}
            onResume={resume}
          />
        </div>

        <aside
          aria-label="Quick Overview"
          className="grid min-w-0 gap-4 sm:grid-cols-2 xl:flex xl:flex-col xl:gap-3 xl:rounded-[24px] xl:bg-soft2 xl:p-4"
        >
          <ProjectsPanel
            projects={projects}
            preview={false}
            className="sm:col-span-2 xl:col-span-1"
          />
          <PendingTasks pending={pending} />
          <Milestones milestones={milestones} />
          <WeeklyActivity weekly={data.weekly} className="sm:col-span-2 xl:col-span-1" />
        </aside>
      </div>
    </div>
  );
}
