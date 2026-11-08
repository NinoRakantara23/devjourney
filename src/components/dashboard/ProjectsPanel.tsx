import { ChevronRight, FolderKanban } from 'lucide-react';
import { EmptyState, ProgressBar, SectionHeader } from '../ui';
import type { Project } from '../../types';

const tones = [
  {
    card: 'bg-brand text-white',
    muted: 'text-white/90',
    icon: 'text-white/90',
    track: 'bg-white/30',
    bar: 'bg-white',
  },
  {
    card: 'bg-sun text-[#4a3a05]',
    muted: 'text-[#6b5716]',
    icon: 'text-[#6b5716]',
    track: 'bg-white/40',
    bar: 'bg-[#4a3a05]',
  },
  {
    card: 'bg-coral text-[#4a1a0a]',
    muted: 'text-[#632916]',
    icon: 'text-[#632916]',
    track: 'bg-white/35',
    bar: 'bg-white',
  },
  {
    card: 'bg-aqua text-[#0b3a44]',
    muted: 'text-[#14515e]',
    icon: 'text-[#14515e]',
    track: 'bg-white/35',
    bar: 'bg-white',
  },
];

function ProjectTile({ project, tone }: { project: Project; tone: (typeof tones)[number] }) {
  return (
    <a
      href={`#/proyek?project=${project.id}`}
      aria-label={`Buka detail proyek ${project.name}`}
      className={`group relative flex min-h-[100px] flex-col justify-between overflow-hidden rounded-[18px] p-3 shadow-cardLift transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel motion-reduce:hover:translate-y-0 ${tone.card}`}
      title={project.description ?? project.name}
    >
      <span aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-2">
        <span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${tone.muted}`}>
          {project.status}
        </span>
        <FolderKanban size={16} className={tone.icon} aria-hidden />
      </div>

      <div className="relative mt-2">
        <h3 className="break-words text-[12.5px] font-bold leading-snug" title={project.name}>
          {project.name}
        </h3>
        <div className={`mt-2 flex items-center justify-between text-[9.5px] font-semibold ${tone.muted}`}>
          <span>{project.total ? `${project.done}/${project.total} tasks` : 'No tasks yet'}</span>
          <span>{project.progress === null ? '—' : `${project.progress}%`}</span>
        </div>
        <ProgressBar
          value={project.progress}
          trackClassName={tone.track}
          barClassName={tone.bar}
          className="mt-1.5"
          label={`Progres ${project.name}`}
        />
      </div>
    </a>
  );
}

export default function ProjectsPanel({
  projects,
  preview,
  className = '',
}: {
  projects: Project[];
  preview: boolean;
  className?: string;
}) {
  const visible = projects.slice(0, 4);

  return (
    <section className={className} aria-labelledby="projects-heading">
      <SectionHeader
        id="projects-heading"
        title="My Projects"
        subtitle={preview ? 'Data contoh untuk pratinjau' : 'Ringkasan proyek aktif'}
        aside={
          <>
            <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted">
              {projects.length}
            </span>
            <a
              href="#/proyek"
              aria-label="Lihat semua proyek"
              title="Lihat semua proyek"
              className="grid h-8 w-8 place-items-center rounded-[10px] bg-soft text-muted transition-colors hover:bg-brandSoft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ChevronRight size={15} aria-hidden />
            </a>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Tidak ada proyek">
          Proyek yang cocok dengan pencarian akan muncul di sini.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {visible.map((project, index) => (
            <ProjectTile key={project.id} project={project} tone={tones[index % tones.length]} />
          ))}
        </div>
      )}

      {projects.length > 4 ? (
        <p className="mt-2 text-right text-[10px] font-medium text-muted">
          +{projects.length - 4} proyek lainnya
        </p>
      ) : null}
    </section>
  );
}
