import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Filter,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createTask,
  deleteTask,
  getProjects,
  getRoadmap,
  getTasks,
  updateTask,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import {
  Card,
  EmptyState,
  PriorityBadge,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { Button, ConfirmDialog, Field, Modal, fieldControl } from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type { Priority, Status, Task, TaskInput } from '../types';
import { formatDate, isOverdue } from '../utils';

const statusOptions: { value: Status; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Completed' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusFilters = ['all', 'todo', 'in_progress', 'blocked', 'done'] as const;
type StatusFilter = (typeof statusFilters)[number];
const priorityFilters = ['all', 'critical', 'high', 'medium', 'low'] as const;
type PriorityFilter = (typeof priorityFilters)[number];

function statusLabel(status: Status) {
  return statusOptions.find((item) => item.value === status)?.label ?? status;
}

type TaskForm = {
  project_id: number;
  title: string;
  status: Status;
  priority: Priority;
  target_date: string;
  roadmap_stage_id: number | null;
  blocked_reason: string;
  next_step: string;
  note: string;
};

const emptyForm: TaskForm = {
  project_id: 0,
  title: '',
  status: 'todo',
  priority: 'medium',
  target_date: '',
  roadmap_stage_id: null,
  blocked_reason: '',
  next_step: '',
  note: '',
};

function TaskRow({
  task,
  busy,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  onChangeStatus: (status: Status) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-[16px] border border-line bg-card p-3.5 shadow-cardLift">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-[12.5px] font-bold leading-snug text-ink">{task.title}</h3>
            <PriorityBadge priority={task.priority} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-medium text-muted">
            <span className="inline-flex items-center gap-1">
              <ListChecks size={12} aria-hidden /> {task.project} · #{task.id}
            </span>
            {task.stage_title ? (
              <span className="rounded-full bg-soft px-2 py-0.5 text-[9px] font-bold text-muted">
                {task.stage_title}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 ${
                isOverdue(task.target_date) && task.status !== 'done' ? 'text-coral' : ''
              }`}
            >
              <CalendarDays size={11} aria-hidden /> {formatDate(task.target_date)}
            </span>
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.status === 'blocked' ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-coralSoft/70 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-[#8f3b23] dark:bg-[#3a2722] dark:text-orange-200">
          <AlertCircle size={12} className="mt-0.5 flex-none" aria-hidden />
          <span>
            <b>Terhambat:</b> {task.blocked_reason ?? 'alasan belum dicatat'}
          </span>
        </p>
      ) : null}

      {task.next_step ? (
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          <span className="font-bold text-ink">Langkah berikutnya:</span> {task.next_step}
        </p>
      ) : null}

      {task.note ? (
        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">
          <span className="font-bold text-ink">Catatan:</span> {task.note}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
          Status
          <select
            value={task.status}
            disabled={busy}
            onChange={(event) => onChangeStatus(event.target.value as Status)}
            aria-label={`Ubah status ${task.title}`}
            className="rounded-[8px] border border-line bg-soft px-2 py-1 text-[10.5px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-wait disabled:opacity-60"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {busy ? <Loader2 size={12} className="animate-spin text-brand" aria-hidden /> : null}
        </label>

        <a
          href={`#/perjalanan?task=${task.id}`}
          className="inline-flex items-center gap-1 rounded-[8px] bg-soft px-2 py-1 text-[10px] font-bold text-brand transition-colors hover:bg-brandSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Buka catatan <ArrowRight size={11} aria-hidden />
        </a>

        <Button variant="secondary" onClick={onEdit} className="px-2 py-1">
          <Pencil size={11} aria-hidden /> Edit
        </Button>
        <Button variant="danger" onClick={onDelete} className="px-2 py-1">
          <Trash2 size={11} aria-hidden /> Hapus
        </Button>
      </div>
    </li>
  );
}

export default function TasksPage({ query }: { query: string }) {
  const tasksState = useApiData(() => getTasks(), []);
  const projectsState = useApiData(() => getProjects(), []);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | number>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyTask, setBusyTask] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');

  const stageState = useApiData(
    () => (form.project_id ? getRoadmap(form.project_id) : Promise.resolve([])),
    [form.project_id, modal],
  );

  const tasks = tasksState.data ?? [];
  const projects = projectsState.data ?? [];
  const stages = stageState.data ?? [];

  useEffect(() => {
    if (projects.length === 0) {
      setForm((current) => (current.project_id === 0 ? current : { ...current, project_id: 0 }));
      return;
    }
    setForm((current) => {
      if (projects.some((project) => project.id === current.project_id)) return current;
      return { ...current, project_id: projects[0].id, roadmap_stage_id: null };
    });
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery =
        q === '' ||
        [
          task.title,
          task.project,
          task.stage_title,
          task.blocked_reason,
          task.next_step,
          task.note,
        ].some((value) => (value ?? '').toLowerCase().includes(q));
      const matchesStatus = filter === 'all' || task.status === filter;
      const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesProject && matchesPriority;
    });
  }, [filter, priorityFilter, projectFilter, query, tasks]);

  const counts = useMemo(
    () => ({
      in_progress: tasks.filter((task) => task.status === 'in_progress').length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      blocked: tasks.filter((task) => task.status === 'blocked').length,
      done: tasks.filter((task) => task.status === 'done').length,
    }),
    [tasks],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      project_id: projects[0]?.id ?? 0,
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('create');
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      project_id: task.project_id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      target_date: task.target_date ?? '',
      roadmap_stage_id: task.roadmap_stage_id,
      blocked_reason: task.blocked_reason ?? '',
      next_step: task.next_step ?? '',
      note: task.note ?? '',
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('edit');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const title = form.title.trim();
    setFormError('');
    setNotice('');
    setSuccess('');

    if (!title) {
      setFormError('Judul tugas wajib diisi.');
      return;
    }
    if (title.length > 255) {
      setFormError('Judul tugas maksimal 255 karakter.');
      return;
    }
    if (!form.project_id || !projects.some((project) => project.id === form.project_id)) {
      setFormError('Pilih proyek yang valid terlebih dahulu.');
      return;
    }
    if (
      form.roadmap_stage_id !== null &&
      !stages.some((stage) => stage.id === form.roadmap_stage_id)
    ) {
      setFormError('Tahap roadmap tidak valid untuk proyek ini.');
      return;
    }

    const payload: TaskInput = {
      project_id: form.project_id,
      title,
      status: form.status,
      priority: form.priority,
      target_date: form.target_date || null,
      roadmap_stage_id: form.roadmap_stage_id,
      blocked_reason: form.blocked_reason.trim() || null,
      next_step: form.next_step.trim() || null,
      note: form.note.trim() || null,
    };

    setBusy(true);
    try {
      if (modal === 'edit' && editing) {
        await updateTask(editing.id, payload);
        await tasksState.reload();
        setSuccess(`Tugas #${editing.id} berhasil diperbarui.`);
      } else {
        const created = await createTask(payload);
        await tasksState.reload();
        setSuccess(`Tugas #${created.id} berhasil ditambahkan.`);
      }
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan tugas.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (task: Task, status: Status) => {
    if (busyTask !== null || status === task.status) return;
    setNotice('');
    setSuccess('');
    setBusyTask(task.id);
    try {
      await updateTask(task.id, { status });
      await tasksState.reload();
      setSuccess(`Status tugas #${task.id} diubah menjadi ${statusLabel(status)}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal memperbarui status tugas.');
    } finally {
      setBusyTask(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      await deleteTask(deleteTarget.id);
      const label = deleteTarget.title;
      setDeleteTarget(null);
      await tasksState.reload();
      setSuccess(`Tugas “${label}” diarsipkan dan tidak lagi tampil di daftar aktif.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus tugas.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (tasksState.loading && !tasksState.data && projectsState.loading && !projectsState.data) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat tugas..." />
      </div>
    );
  }

  if (tasksState.error && !tasksState.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={ListChecks}
          title="Tasks"
          description="Kelola tugas yang terhubung dengan proyek."
        />
        <PageError message={tasksState.error} onRetry={() => void tasksState.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ListChecks}
        title="Tasks"
        description="Daftar tugas lengkap dari database. Tambah, edit, ubah status, dan arsipkan tugas tanpa kehilangan relasi proyek."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreate} disabled={projects.length === 0}>
          <Plus size={14} aria-hidden /> Tambah tugas
        </Button>
      </PageHeader>

      {tasksState.error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <Button variant="primary" onClick={() => void tasksState.reload()}>
              Coba lagi
            </Button>
          }
        >
          {tasksState.error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      {projectsState.error ? (
        <ApiNotice tone="warning" title="Daftar proyek tidak dapat dimuat">
          {projectsState.error}. Form tambah/edit membutuhkan proyek yang valid.
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
        <StatTile label="In Progress" value={counts.in_progress} icon={Loader2} tone="brand" />
        <StatTile label="To Do" value={counts.todo} tone="aqua" />
        <StatTile label="Blocked" value={counts.blocked} tone="coral" />
        <StatTile label="Completed" value={counts.done} tone="sun" />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Filter size={14} className="text-brand" aria-hidden /> Filter tugas
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Proyek
              <select
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(
                    event.target.value === 'all' ? 'all' : Number(event.target.value),
                  )
                }
                className="max-w-[220px] rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">Semua proyek</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Status
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                {statusFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Semua status' : statusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Prioritas
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                {priorityFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Semua prioritas' : priorityOptions.find((option) => option.value === item)?.label}
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

      {projects.length === 0 && !projectsState.loading ? (
        <ApiNotice tone="warning" title="Belum ada proyek">
          Tambah proyek terlebih dahulu dari halaman Proyek. Tugas harus terhubung ke proyek yang valid.
        </ApiNotice>
      ) : null}

      <section aria-labelledby="tasks-list-heading">
        <SectionHeader
          id="tasks-list-heading"
          title="Daftar tugas"
          subtitle="Semua tugas aktif dari GET /tasks"
          aside={
            <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
              {filtered.length}
            </span>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title={tasks.length === 0 ? 'Belum ada tugas' : 'Tidak ada tugas yang cocok'}>
            {tasks.length === 0
              ? 'Tambahkan tugas pertama melalui tombol Tambah tugas atau Quick Add di Dashboard.'
              : 'Ubah filter proyek, status, prioritas, atau kata kunci pencarian.'}
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={busyTask === task.id}
                onChangeStatus={(status) => void changeStatus(task, status)}
                onEdit={() => openEdit(task)}
                onDelete={() => setDeleteTarget(task)}
              />
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modal !== null}
        title={modal === 'edit' ? 'Edit tugas' : 'Tambah tugas'}
        description={
          modal === 'edit'
            ? 'Perubahan disimpan melalui PATCH /tasks/{id}.'
            : 'Tugas baru disimpan melalui POST /tasks dan langsung muncul di daftar.'
        }
        onClose={() => {
          if (!busy) setModal(null);
        }}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="task-form" disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {busy ? 'Menyimpan...' : 'Simpan tugas'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul tugas" htmlFor="task-title" className="sm:col-span-2">
            <input
              id="task-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={255}
              required
              autoFocus
              placeholder="Tulis satu langkah yang jelas..."
              className={fieldControl}
            />
          </Field>
          <Field label="Proyek" htmlFor="task-project">
            <select
              id="task-project"
              value={form.project_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  project_id: Number(event.target.value),
                  roadmap_stage_id: null,
                }))
              }
              disabled={projects.length === 0}
              className={fieldControl}
            >
              {projects.length === 0 ? <option value={0}>Belum ada proyek</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Tahap roadmap"
            htmlFor="task-stage"
            hint={
              form.project_id
                ? 'Opsional. Tahap harus milik proyek yang dipilih.'
                : 'Pilih proyek terlebih dahulu.'
            }
          >
            <select
              id="task-stage"
              value={form.roadmap_stage_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  roadmap_stage_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
              disabled={!form.project_id || stageState.loading}
              className={fieldControl}
            >
              <option value="">Tanpa tahap</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.position}. {stage.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="task-status">
            <select
              id="task-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as Status }))
              }
              className={fieldControl}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioritas" htmlFor="task-priority">
            <select
              id="task-priority"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as Priority }))
              }
              className={fieldControl}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target tanggal" htmlFor="task-target">
            <input
              id="task-target"
              type="date"
              value={form.target_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, target_date: event.target.value }))
              }
              className={fieldControl}
            />
          </Field>
          <Field label="Alasan terhambat" htmlFor="task-blocked">
            <input
              id="task-blocked"
              value={form.blocked_reason}
              onChange={(event) =>
                setForm((current) => ({ ...current, blocked_reason: event.target.value }))
              }
              maxLength={255}
              placeholder="Diisi jika status Blocked"
              className={fieldControl}
            />
          </Field>
          <Field label="Langkah berikutnya" htmlFor="task-next" className="sm:col-span-2">
            <input
              id="task-next"
              value={form.next_step}
              onChange={(event) =>
                setForm((current) => ({ ...current, next_step: event.target.value }))
              }
              maxLength={255}
              placeholder="Apa yang dilakukan setelah ini?"
              className={fieldControl}
            />
          </Field>
          <Field label="Catatan" htmlFor="task-note" className="sm:col-span-2">
            <textarea
              id="task-note"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              placeholder="Konteks, keputusan, atau hasil terakhir..."
              className={fieldControl}
            />
          </Field>
          {stageState.error ? (
            <p className="sm:col-span-2 text-[10.5px] font-medium text-coral">
              Tahap roadmap tidak dapat dimuat: {stageState.error}
            </p>
          ) : null}
          {formError ? (
            <p role="alert" className="sm:col-span-2 text-[11px] font-semibold text-coral">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Arsipkan tugas?"
        confirmLabel="Arsipkan tugas"
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
        message={
          <>
            Tugas <b>{deleteTarget?.title}</b> akan diarsipkan dan hilang dari daftar aktif. Catatan sesi kerja
            yang sudah tersimpan tetap dipertahankan sebagai histori.
          </>
        }
      />
    </div>
  );
}
