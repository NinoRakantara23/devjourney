import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Filter,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import {
  createMilestone,
  deleteMilestone,
  getMilestones,
  getProjects,
  updateMilestone,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import { Card, EmptyState, SectionHeader, StatusBadge } from '../components/ui';
import { Button, ConfirmDialog, Field, Modal, fieldControl } from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type { Milestone, MilestoneInput, MilestoneStatus } from '../types';
import { formatDate, isOverdue } from '../utils';

const statusOptions: { value: MilestoneStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'reached', label: 'Reached' },
];

type MilestoneForm = {
  project_id: number;
  title: string;
  description: string;
  target_date: string;
  status: MilestoneStatus;
};

const emptyForm: MilestoneForm = {
  project_id: 0,
  title: '',
  description: '',
  target_date: '',
  status: 'planned',
};

export default function MilestonePage({ query }: { query: string }) {
  const projectsState = useApiData(() => getProjects(), []);
  const milestonesState = useApiData(() => getMilestones(), []);
  const [projectFilter, setProjectFilter] = useState<'all' | number>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | MilestoneStatus>('all');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState<MilestoneForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [pendingReachedSave, setPendingReachedSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reachedTarget, setReachedTarget] = useState<Milestone | null>(null);
  const [reachedBusy, setReachedBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');

  const projects = projectsState.data ?? [];
  const milestones = milestonesState.data ?? [];

  useEffect(() => {
    if (projects.length === 0) {
      setForm((current) => (current.project_id === 0 ? current : { ...current, project_id: 0 }));
      return;
    }
    setForm((current) => {
      if (projects.some((project) => project.id === current.project_id)) return current;
      return { ...current, project_id: projects[0].id };
    });
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return milestones.filter((milestone) => {
      const matchesQuery =
        q === '' ||
        [milestone.title, milestone.description, milestone.project, milestone.status].some((value) =>
          (value ?? '').toLowerCase().includes(q),
        );
      const matchesProject = projectFilter === 'all' || milestone.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || milestone.status === statusFilter;
      return matchesQuery && matchesProject && matchesStatus;
    });
  }, [milestones, projectFilter, query, statusFilter]);

  const planned = milestones.filter((milestone) => milestone.status === 'planned');
  const reached = milestones.filter((milestone) => milestone.status === 'reached');
  const nearest = useMemo(
    () =>
      [...planned]
        .filter((milestone) => milestone.target_date)
        .sort((a, b) => (a.target_date ?? '').localeCompare(b.target_date ?? ''))[0] ?? null,
    [planned],
  );
  const overdue = planned.filter(
    (milestone) => milestone.status === 'planned' && isOverdue(milestone.target_date),
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      project_id:
        projectFilter === 'all' ? projects[0]?.id ?? 0 : projectFilter,
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('create');
  };

  const openEdit = (milestone: Milestone) => {
    setEditing(milestone);
    setForm({
      project_id: milestone.project_id,
      title: milestone.title,
      description: milestone.description ?? '',
      target_date: milestone.target_date ?? '',
      status: milestone.status,
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('edit');
  };

  const requestSave = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const title = form.title.trim();
    setFormError('');
    setNotice('');
    setSuccess('');

    if (!title) {
      setFormError('Nama milestone wajib diisi.');
      return;
    }
    if (title.length > 255) {
      setFormError('Nama milestone maksimal 255 karakter.');
      return;
    }
    if (!form.project_id || !projects.some((project) => project.id === form.project_id)) {
      setFormError('Pilih proyek yang valid terlebih dahulu.');
      return;
    }
    if (form.status === 'reached' && editing?.status !== 'reached') {
      setPendingReachedSave(true);
      return;
    }
    void persistSave();
  };

  const persistSave = async () => {
    if (busy) return;
    const title = form.title.trim();
    setBusy(true);
    setPendingReachedSave(false);
    try {
      const payload: MilestoneInput = {
        project_id: form.project_id,
        title,
        description: form.description.trim() || null,
        target_date: form.target_date || null,
        status: form.status,
      };
      if (modal === 'edit' && editing) {
        await updateMilestone(editing.id, payload);
        await milestonesState.reload();
        setSuccess(`Milestone “${title}” berhasil diperbarui.`);
      } else {
        const created = await createMilestone(payload);
        await milestonesState.reload();
        setSuccess(`Milestone “${created.title}” berhasil dibuat.`);
      }
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan milestone.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReached = async () => {
    if (!reachedTarget || reachedBusy) return;
    setReachedBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const title = reachedTarget.title;
      await updateMilestone(reachedTarget.id, { status: 'reached' });
      setReachedTarget(null);
      await milestonesState.reload();
      setSuccess(`Milestone “${title}” ditandai reached atas konfirmasi.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menandai milestone reached.');
    } finally {
      setReachedBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const title = deleteTarget.title;
      await deleteMilestone(deleteTarget.id);
      setDeleteTarget(null);
      await milestonesState.reload();
      setSuccess(`Milestone “${title}” diarsipkan. Tahap roadmap terkait tidak dihapus.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus milestone.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (milestonesState.loading && !milestonesState.data) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat milestone..." />
      </div>
    );
  }

  if (milestonesState.error && !milestonesState.data) {
    return (
      <div className="space-y-4">
        <PageHeader icon={Target} title="Milestone" description="Target dan tonggak penting per proyek." />
        <PageError message={milestonesState.error} onRetry={() => void milestonesState.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Target}
        title="Milestone"
        description="Kelola milestone per proyek, target tanggal, status planned/reached, dan indikator target terdekat."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreate} disabled={projects.length === 0}>
          <Plus size={14} aria-hidden /> Tambah milestone
        </Button>
      </PageHeader>

      {milestonesState.error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <Button variant="primary" onClick={() => void milestonesState.reload()}>
              Coba lagi
            </Button>
          }
        >
          {milestonesState.error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      {projectsState.error ? (
        <ApiNotice tone="warning" title="Daftar proyek tidak dapat dimuat">
          {projectsState.error}. Form milestone membutuhkan proyek yang valid.
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
        <StatTile label="Planned" value={planned.length} icon={Target} tone="brand" />
        <StatTile label="Reached" value={reached.length} icon={CheckCircle2} tone="aqua" />
        <StatTile
          label="Terdekat"
          value={nearest ? formatDate(nearest.target_date) : '—'}
          icon={CalendarDays}
          tone="sun"
        />
        <StatTile label="Lewat target" value={overdue} icon={Flag} tone={overdue > 0 ? 'coral' : 'neutral'} />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Filter size={14} className="text-brand" aria-hidden /> Filter milestone
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Proyek
              <select
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
                }
                className="max-w-[230px] rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
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
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | MilestoneStatus)
                }
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">Semua status</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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

      <section aria-labelledby="milestone-list-heading">
        <SectionHeader
          id="milestone-list-heading"
          title="Daftar milestone"
          subtitle="Diurutkan berdasarkan target terdekat"
          aside={
            <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
              {filtered.length}
            </span>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Target}
            title={milestones.length === 0 ? 'Belum ada milestone' : 'Tidak ada milestone yang cocok'}
          >
            {milestones.length === 0
              ? 'Tambahkan milestone pertama untuk memberi target yang dapat dihubungkan ke roadmap.'
              : 'Ubah filter proyek/status atau kata kunci pencarian.'}
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((milestone) => {
              const nearestItem = nearest?.id === milestone.id;
              const late = milestone.status === 'planned' && isOverdue(milestone.target_date);
              return (
                <li
                  key={milestone.id}
                  className={`rounded-[16px] border bg-card p-3.5 shadow-cardLift ${
                    nearestItem ? 'border-brand/35 ring-1 ring-brand/10' : 'border-line'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-[12.5px] font-bold leading-snug text-ink">
                          {milestone.title}
                        </h3>
                        <StatusBadge status={milestone.status} />
                        {nearestItem ? (
                          <span className="rounded-full bg-brandSoft px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-brand">
                            Terdekat
                          </span>
                        ) : null}
                        {late ? (
                          <span className="rounded-full bg-coralSoft px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#b84a2b] dark:text-orange-200">
                            Lewat target
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Flag size={11} aria-hidden /> {milestone.project}
                        </span>
                        {milestone.description ? (
                          <span className="line-clamp-1">{milestone.description}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="inline-flex flex-none items-center gap-1 rounded-full bg-soft px-2 py-1 text-[9px] font-bold text-muted">
                      <CalendarDays size={10} aria-hidden /> {formatDate(milestone.target_date)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[9.5px] font-semibold text-muted">
                    <span className="rounded-full bg-soft px-2 py-1">
                      {milestone.stage_total > 0
                        ? `${milestone.stage_done}/${milestone.stage_total} tahap selesai`
                        : 'Belum ada tahap terkait'}
                    </span>
                    {milestone.completed_at ? (
                      <span className="rounded-full bg-aquaSoft px-2 py-1 text-[#0e6b7b] dark:text-cyan-200">
                        Reached {formatDate(milestone.completed_at)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                    {milestone.status === 'planned' ? (
                      <Button
                        variant="secondary"
                        onClick={() => setReachedTarget(milestone)}
                        className="px-2 py-1"
                      >
                        <CheckCircle2 size={11} aria-hidden /> Tandai reached
                      </Button>
                    ) : null}
                    <Button variant="secondary" onClick={() => openEdit(milestone)} className="px-2 py-1">
                      <Pencil size={11} aria-hidden /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDeleteTarget(milestone)}
                      className="px-2 py-1"
                    >
                      <Trash2 size={11} aria-hidden /> Hapus
                    </Button>
                    <span className="text-[9.5px] text-muted">
                      Status reached hanya berubah setelah konfirmasi.
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={modal !== null}
        title={modal === 'edit' ? 'Edit milestone' : 'Tambah milestone'}
        description={
          modal === 'edit'
            ? 'Perubahan disimpan melalui PATCH /milestones/{id}.'
            : 'Milestone baru disimpan melalui POST /milestones.'
        }
        onClose={() => {
          if (!busy) setModal(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="milestone-form" disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {busy ? 'Menyimpan...' : 'Simpan milestone'}
            </Button>
          </>
        }
      >
        <form id="milestone-form" onSubmit={requestSave} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama milestone" htmlFor="milestone-title" className="sm:col-span-2">
            <input
              id="milestone-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={255}
              required
              autoFocus
              placeholder="Contoh: Prototype alur triase selesai"
              className={fieldControl}
            />
          </Field>
          <Field label="Proyek" htmlFor="milestone-project">
            <select
              id="milestone-project"
              value={form.project_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, project_id: Number(event.target.value) }))
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
          <Field label="Status" htmlFor="milestone-status">
            <select
              id="milestone-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as MilestoneStatus,
                }))
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
          <Field label="Target tanggal" htmlFor="milestone-target" className="sm:col-span-2">
            <input
              id="milestone-target"
              type="date"
              value={form.target_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, target_date: event.target.value }))
              }
              className={fieldControl}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="milestone-description" className="sm:col-span-2">
            <textarea
              id="milestone-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="Kriteria atau hasil yang menandai milestone ini..."
              className={fieldControl}
            />
          </Field>
          {formError ? (
            <p role="alert" className="sm:col-span-2 text-[11px] font-semibold text-coral">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingReachedSave}
        title="Tandai milestone reached?"
        confirmLabel="Tandai reached"
        tone="primary"
        busy={busy}
        onClose={() => setPendingReachedSave(false)}
        onConfirm={() => void persistSave()}
        message={
          <>
            Milestone <b>{form.title.trim() || 'ini'}</b> akan disimpan dengan status reached. Pastikan hasilnya
            sudah benar-benar tercapai; status tidak dibuat otomatis dari tanggal.
          </>
        }
      />

      <ConfirmDialog
        open={reachedTarget !== null}
        title="Tandai milestone reached?"
        confirmLabel="Tandai reached"
        tone="primary"
        busy={reachedBusy}
        onClose={() => {
          if (!reachedBusy) setReachedTarget(null);
        }}
        onConfirm={() => void confirmReached()}
        message={
          <>
            Milestone <b>{reachedTarget?.title}</b> akan ditandai reached atas konfirmasi Anda. Tindakan ini
            mencatat waktu penyelesaian di database.
          </>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Arsipkan milestone?"
        confirmLabel="Arsipkan milestone"
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
        message={
          <>
            Milestone <b>{deleteTarget?.title}</b> akan diarsipkan. Tahap roadmap yang pernah terhubung tidak
            dihapus; relasi milestone pada tahap lama tetap tersimpan.
          </>
        }
      />
    </div>
  );
}
