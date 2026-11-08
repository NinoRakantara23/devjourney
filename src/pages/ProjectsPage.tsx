import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Cpu,
  Filter,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import { getHashParams, useHash } from '../navigation';
import {
  Card,
  EmptyState,
  PriorityBadge,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import {
  Button,
  ConfirmDialog,
  Field,
  Modal,
  fieldControl,
} from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type { Priority, Project, ProjectInput, ProjectStatus } from '../types';
import { formatDate } from '../utils';

const statusFilters = ['all', 'active', 'paused', 'completed'] as const;
const priorityFilters = ['all', 'critical', 'high', 'medium', 'low'] as const;
type StatusFilter = (typeof statusFilters)[number];
type PriorityFilter = (typeof priorityFilters)[number];

const statusLabel: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

type ProjectForm = {
  name: string;
  description: string;
  technologies: string;
  target_date: string;
  status: ProjectStatus;
  priority: Priority;
};

const emptyForm: ProjectForm = {
  name: '',
  description: '',
  technologies: '',
  target_date: '',
  status: 'active',
  priority: 'medium',
};

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Buka detail proyek ${project.name}`}
      className="group flex min-h-[190px] flex-col rounded-[18px] border border-line bg-card p-4 text-left shadow-cardLift transition-colors hover:border-brand/35 hover:bg-soft2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-brandSoft text-brand">
          <FolderKanban size={16} aria-hidden />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <PriorityBadge priority={project.priority} />
          <StatusBadge status={project.status} />
        </div>
      </div>

      <h3 className="mt-3 break-words text-[13px] font-bold leading-snug text-ink">{project.name}</h3>
      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
        {project.description ?? 'Belum ada deskripsi proyek.'}
      </p>

      {project.technologies ? (
        <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted">
          <Cpu size={11} className="mt-0.5 flex-none" aria-hidden />
          <span className="line-clamp-1">{project.technologies}</span>
        </p>
      ) : null}

      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between text-[9.5px] font-semibold text-muted">
          <span>{project.total > 0 ? `${project.done}/${project.total} tugas` : 'Belum ada tugas'}</span>
          <span>{project.progress === null ? '—' : `${project.progress}%`}</span>
        </div>
        <ProgressBar value={project.progress} className="mt-1.5" label={`Progres ${project.name}`} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted">
            <CalendarDays size={10} aria-hidden /> {formatDate(project.target_date)}
          </span>
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand">
            Lihat detail <ChevronRight size={12} aria-hidden />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ProjectsPage({ query }: { query: string }) {
  const { data: projects, loading, error, reload } = useApiData(() => getProjects(), []);
  const hash = useHash();
  const selectedId = useMemo(() => {
    const raw = Number(getHashParams(hash).get('project'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [hash]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const detailRef = useRef<HTMLElement | null>(null);

  const list = projects ?? [];
  const selected = selectedId === null ? null : list.find((project) => project.id === selectedId) ?? null;
  const missingSelected = selectedId !== null && !loading && projects !== null && selected === null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((project) => {
      const matchesQuery =
        q === '' ||
        [project.name, project.description, project.technologies, project.status, project.priority].some(
          (value) => (value ?? '').toLowerCase().includes(q),
        );
      const matchesStatus = status === 'all' || project.status === status;
      const matchesPriority = priority === 'all' || project.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [list, priority, query, status]);

  const counts = useMemo(
    () => ({
      active: list.filter((project) => project.status === 'active').length,
      paused: list.filter((project) => project.status === 'paused').length,
      completed: list.filter((project) => project.status === 'completed').length,
    }),
    [list],
  );

  useEffect(() => {
    if (selected) detailRef.current?.focus();
  }, [selected]);

  const openProject = (id: number) => {
    window.location.hash = `#/proyek?project=${id}`;
  };

  const closeDetail = () => {
    window.location.hash = '#/proyek';
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('create');
  };

  const openEdit = (project: Project) => {
    setForm({
      name: project.name,
      description: project.description ?? '',
      technologies: project.technologies ?? '',
      target_date: project.target_date ?? '',
      status: project.status,
      priority: project.priority,
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('edit');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    setFormError('');
    setNotice('');
    setSuccess('');

    if (!name) {
      setFormError('Nama proyek wajib diisi.');
      return;
    }
    if (name.length > 150) {
      setFormError('Nama proyek maksimal 150 karakter.');
      return;
    }
    if (form.technologies.trim().length > 255) {
      setFormError('Teknologi maksimal 255 karakter.');
      return;
    }

    const payload: ProjectInput = {
      name,
      description: form.description.trim() || null,
      technologies: form.technologies.trim() || null,
      target_date: form.target_date || null,
      status: form.status,
      priority: form.priority,
    };

    setBusy(true);
    try {
      if (modal === 'edit' && selected) {
        await updateProject(selected.id, payload);
        await reload();
        setSuccess(`Proyek “${name}” berhasil diperbarui.`);
      } else {
        const created = await createProject(payload);
        await reload();
        setSuccess(`Proyek “${created.name}” berhasil dibuat.`);
        window.location.hash = `#/proyek?project=${created.id}`;
      }
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan proyek.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const result = await deleteProject(deleteTarget.id);
      if (selectedId === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
      await reload();
      setSuccess(
        `Proyek “${deleteTarget.name}” diarsipkan. ${result.retained_tasks} tugas terkait tetap tersimpan dan tidak dihapus.`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus proyek.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading && !projects) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat proyek..." />
      </div>
    );
  }

  if (error && !projects) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={FolderKanban}
          title="Proyek"
          description="Kelola proyek yang tersimpan di database DevJourney."
        />
        <PageError message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FolderKanban}
        title="Proyek"
        description="Tambah, cari, filter, edit, dan arsipkan proyek. Semua perubahan dikirim ke database melalui API."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreate}>
          <Plus size={14} aria-hidden /> Tambah proyek
        </Button>
      </PageHeader>

      {error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <Button variant="primary" onClick={() => void reload()}>
              Coba lagi
            </Button>
          }
        >
          {error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      <div aria-live="polite" className="space-y-1">
        {notice ? <p role="status" className="text-[11px] font-medium text-coral">{notice}</p> : null}
        {success ? (
          <p role="status" className="rounded-[12px] border border-aqua/30 bg-aquaSoft px-3 py-2 text-[11px] font-medium text-[#0e6b7b] dark:text-cyan-200">
            {success}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total" value={list.length} icon={FolderKanban} tone="brand" />
        <StatTile label="Active" value={counts.active} tone="aqua" />
        <StatTile label="Paused" value={counts.paused} tone="sun" />
        <StatTile label="Completed" value={counts.completed} tone="neutral" />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Filter size={14} className="text-brand" aria-hidden /> Filter proyek
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                {statusFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Semua status' : statusLabel[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Prioritas
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as PriorityFilter)}
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                {priorityFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Semua prioritas' : priorityLabel[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {query.trim() ? (
          <p className="mt-2 text-[10.5px] text-muted">
            Pencarian aktif: <span className="font-semibold text-ink">“{query.trim()}”</span>
          </p>
        ) : null}
      </Card>

      {missingSelected ? (
        <ApiNotice tone="warning" title="Proyek tidak ditemukan">
          Proyek dengan ID {selectedId} tidak ada atau sudah diarsipkan.{' '}
          <button
            type="button"
            onClick={closeDetail}
            className="font-bold text-brand underline-offset-2 hover:underline"
          >
            Tutup detail
          </button>
        </ApiNotice>
      ) : null}

      <section aria-labelledby="projects-list-heading">
        <SectionHeader
          id="projects-list-heading"
          title="Daftar proyek"
          subtitle="Klik kartu untuk membuka detail"
          aside={
            <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
              {filtered.length}
            </span>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={list.length === 0 ? 'Belum ada proyek' : 'Tidak ada proyek yang cocok'}
          >
            {list.length === 0
              ? 'Tambahkan proyek pertama untuk mulai menghubungkan tugas, roadmap, dan milestone.'
              : 'Ubah kata kunci pencarian atau filter untuk melihat proyek lain.'}
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={() => openProject(project.id)} />
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <section
          ref={detailRef}
          tabIndex={-1}
          aria-labelledby="project-detail-title"
          className="rounded-[24px] border border-brand/20 bg-card p-5 shadow-cardLift focus:outline-none"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Detail proyek</p>
              <h2
                id="project-detail-title"
                className="mt-1 break-words font-serif text-[24px] font-semibold leading-tight text-ink"
              >
                {selected.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
                <span className="rounded-full bg-soft px-2 py-0.5 text-[9px] font-bold text-muted">
                  #{selected.id}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => openEdit(selected)}>
                <Pencil size={13} aria-hidden /> Edit
              </Button>
              <Button variant="danger" onClick={() => setDeleteTarget(selected)}>
                <Trash2 size={13} aria-hidden /> Arsipkan
              </Button>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="Tutup detail proyek"
                className="grid h-9 w-9 place-items-center rounded-[10px] bg-soft text-muted transition-colors hover:bg-brandSoft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-[16px] bg-soft2 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Deskripsi</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-ink">
                {selected.description ?? 'Proyek ini belum memiliki deskripsi.'}
              </p>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Teknologi</dt>
                  <dd className="mt-1 text-[12px] font-semibold text-ink">
                    {selected.technologies ?? 'Belum dicatat'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Target selesai</dt>
                  <dd className="mt-1 text-[12px] font-semibold text-ink">
                    {formatDate(selected.target_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Total tugas</dt>
                  <dd className="mt-1 text-[12px] font-semibold text-ink">{selected.total}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Tugas selesai</dt>
                  <dd className="mt-1 text-[12px] font-semibold text-ink">{selected.done}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[16px] border border-line bg-card p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Progres tugas</p>
              <p className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                {selected.progress === null ? '—' : `${selected.progress}%`}
              </p>
              <ProgressBar value={selected.progress} className="mt-3" label={`Progres ${selected.name}`} />
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                Dihitung dari tugas berstatus <span className="font-semibold text-ink">done</span> dibagi total
                tugas aktif. Nilai — berarti proyek belum memiliki tugas.
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-[12px] border border-dashed border-line bg-soft2 px-3 py-2 text-[10px] leading-relaxed text-muted">
            “Arsipkan” melakukan soft-delete: proyek disembunyikan dari daftar, tetapi tugas dan milestone lama
            tetap tersimpan di database.
          </p>
        </section>
      ) : null}

      <Modal
        open={modal !== null}
        title={modal === 'edit' ? 'Edit proyek' : 'Tambah proyek'}
        description={
          modal === 'edit'
            ? 'Perubahan disimpan ke database melalui PATCH /projects/{id}.'
            : 'Proyek baru disimpan ke database melalui POST /projects.'
        }
        onClose={() => {
          if (!busy) setModal(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="project-form" disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {busy ? 'Menyimpan...' : 'Simpan proyek'}
            </Button>
          </>
        }
      >
        <form id="project-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama proyek" htmlFor="project-name" className="sm:col-span-2">
            <input
              id="project-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={150}
              required
              autoFocus
              placeholder="Contoh: Game Triase"
              className={fieldControl}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="project-description" className="sm:col-span-2">
            <textarea
              id="project-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="Ringkasan tujuan proyek..."
              className={fieldControl}
            />
          </Field>
          <Field label="Teknologi" htmlFor="project-technologies">
            <input
              id="project-technologies"
              value={form.technologies}
              onChange={(event) =>
                setForm((current) => ({ ...current, technologies: event.target.value }))
              }
              maxLength={255}
              placeholder="React, PHP, MariaDB"
              className={fieldControl}
            />
          </Field>
          <Field label="Target selesai" htmlFor="project-target">
            <input
              id="project-target"
              type="date"
              value={form.target_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, target_date: event.target.value }))
              }
              className={fieldControl}
            />
          </Field>
          <Field label="Status" htmlFor="project-status">
            <select
              id="project-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))
              }
              className={fieldControl}
            >
              {statusFilters
                .filter((item) => item !== 'all')
                .map((item) => (
                  <option key={item} value={item}>
                    {statusLabel[item as ProjectStatus]}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Prioritas" htmlFor="project-priority">
            <select
              id="project-priority"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as Priority }))
              }
              className={fieldControl}
            >
              {priorityFilters
                .filter((item) => item !== 'all')
                .map((item) => (
                  <option key={item} value={item}>
                    {priorityLabel[item as Priority]}
                  </option>
                ))}
            </select>
          </Field>
          {formError ? (
            <p role="alert" className="sm:col-span-2 text-[11px] font-semibold text-coral">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Arsipkan proyek?"
        confirmLabel="Arsipkan proyek"
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
        message={
          <>
            Proyek <b>{deleteTarget?.name}</b> akan disembunyikan dari daftar. Tugas dan milestone terkait{' '}
            <b>tidak dihapus</b>; data historis tetap tersimpan. Tindakan ini tidak menghapus baris database.
          </>
        }
      />
    </div>
  );
}
