import { lazy, Suspense, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import { PageLoading } from './components/page';
import { routeById, useHashRoute, type RouteId } from './navigation';

const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const MilestonePage = lazy(() => import('./pages/MilestonePage'));
const JourneyPage = lazy(() => import('./pages/JourneyPage'));
const SkillLearningPage = lazy(() => import('./pages/SkillLearningPage'));

const searchConfig: Record<
  RouteId,
  { placeholder: string; disabled?: boolean; disabledHint?: string }
> = {
  dashboard: { placeholder: 'Cari proyek atau tugas...' },
  roadmap: { placeholder: 'Cari tahap atau milestone...' },
  proyek: { placeholder: 'Cari proyek...' },
  tasks: { placeholder: 'Cari tugas...' },
  perjalanan: { placeholder: 'Cari catatan pekerjaan...' },
  milestone: { placeholder: 'Cari milestone...' },
  'skill-learning': { placeholder: 'Cari skill atau materi...' },
};

function RoutedPage({ route, query }: { route: RouteId; query: string }) {
  switch (route) {
    case 'proyek':
      return <ProjectsPage query={query} />;
    case 'tasks':
      return <TasksPage query={query} />;
    case 'roadmap':
      return <RoadmapPage query={query} />;
    case 'milestone':
      return <MilestonePage query={query} />;
    case 'perjalanan':
      return <JourneyPage query={query} />;
    case 'skill-learning':
      return <SkillLearningPage query={query} />;
    default:
      return <Dashboard query={query} />;
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const route = useHashRoute();
  const page = routeById[route];
  const search = searchConfig[route];

  useEffect(() => {
    setQuery('');
  }, [route]);

  useEffect(() => {
    const rawHash = window.location.hash;
    const queryIndex = rawHash.indexOf('?');
    const suffix = queryIndex >= 0 ? rawHash.slice(queryIndex) : '';
    const canonical = page.href + suffix;

    if (rawHash !== canonical) {
      window.history.replaceState(null, '', canonical);
    }

    document.title = route === 'dashboard' ? 'DevJourney — Dashboard' : `DevJourney — ${page.label}`;
  }, [page.href, page.label, route]);

  return (
    <div className="app-viewport flex min-h-screen items-start justify-center bg-bg p-3 sm:p-5 lg:p-8 xl:p-10">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-brand focus:px-3 focus:py-2 focus:text-[12px] focus:font-bold focus:text-white focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>

      <div className="grid w-full max-w-[1240px] gap-0 overflow-hidden rounded-[28px] bg-panel p-2.5 shadow-panelLift sm:rounded-[32px] sm:p-3 lg:grid-cols-[112px_minmax(0,1fr)] lg:rounded-[40px] lg:p-0 2xl:max-w-[1440px]">
        <Sidebar activeRoute={route} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-1 pb-24 pt-2 sm:px-2 lg:px-0 lg:py-5 lg:pb-5 lg:pl-7 lg:pr-7"
        >
          <Header
            query={query}
            onQuery={setQuery}
            placeholder={search.placeholder}
            disabled={search.disabled}
            disabledHint={search.disabledHint}
          />
          <Suspense fallback={<PageLoading label="Memuat halaman..." />}>
            <RoutedPage route={route} query={query} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
