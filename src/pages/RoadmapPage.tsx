import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Flag,
  Loader2,
  Map,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import {
  createStage,
  deleteStage,
  getMilestones,
  getProjects,
  getRoadmap,
  updateStage,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import {
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { Button, ConfirmDialog, Field, Modal, fieldControl } from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type { RoadmapStage, RoadmapStageInput, StageStatus } from '../types';
import { formatDate, isOverdue } from '../utils';

const stageStatusOptions: { value: StageStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Selesai' },
];

type StageForm = {
  title: string;
  description: string;
  status: StageStatus;
  target_date: string;
  milestone_id: number | null;
};

const emptyForm: StageForm = {
  title: '',
  description: '',
  status: 'planned',
  target_date: '',
  milestone_id: null,
};

function stageStatusLabel(status: StageStatus) {
  return stageStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export default function RoadmapPage({ query }: { query: string }) {
  const projectsState = useApiData(() => getProjects(), []);
  const [projectId, setProjectId] = useState(0);
  const stagesState = useApiData(
    () => (projectId ? getRoadmap(projectId) : Promise.resolve([])),
    [projectId],
  );
  const milestonesState = useApiData(
    () => (projectId ? getMilestones({ project_id: projectId }) : Promise.resolve([])),
    [projectId],
  );

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<RoadmapStage | null>(null);
  const [form, setForm] = useState<StageForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [pendingDoneSave, setPendingDoneSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapStage | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [doneTarget, setDoneTarget] = useState<RoadmapStage | null>(null);
  const [doneBusy, setDoneBusy] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');

  const projects = projectsState.data ?? [];
  const stages = stagesState.data ?? [];
  const milestones = milestonesState.data ?? [];
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;

  useEffect(() => {
    if (projects.length === 0) {
      setProjectId(0);
      return;
    }
    if (!projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  const filteredStages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stages;
    return stages.filter((stage) =>
      [stage.title, stage.description, stage.milestone_title, stage.status].some((value) =>
        (value ?? '').toLowerCase().includes(q),
      ),
    );
  }, [query, stages]);

  const counts = useMemo(
    () => ({
      done: stages.filter((stage) => stage.status === 'done').length,
      inProgress: stages.filter((stage) => stage.status === 'in_progress').length,
      blocked: stages.filter((stage) => stage.status === 'blocked').length,
    }),
    [stages],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('create');
  };

  const openEdit = (stage: RoadmapStage) => {
    setEditing(stage);
    setForm({
      title: stage.title,
      description: stage.description ?? '',
      status: stage.status,
      target_date: stage.target_date ?? '',
      milestone_id: stage.milestone_id,
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

    if (!projectId) {
      setFormError('Pilih proyek terlebih dahulu.');
      return;
    }
    if (!title) {
      setFormError('Nama tahap wajib diisi.');
      return;
    }
    if (title.length > 255) {
      setFormError('Nama tahap maksimal 255 karakter.');
      return;
    }
    if (
      form.milestone_id !== null &&
      !milestones.some((milestone) => milestone.id === form.milestone_id)
    ) {
      setFormError('Milestone tidak valid untuk proyek ini.');
      return;
    }

    if (form.status === 'done' && editing?.status !== 'done') {
      setPendingDoneSave(true);
      return;
    }
    void persistSave();
  };

  const persistSave = async () => {
    if (busy) return;
    const title = form.title.trim();
    setBusy(true);
    setPendingDoneSave(false);
    try {
      if (modal === 'edit' && editing) {
        await updateStage(editing.id, {
          title,
          description: form.description.trim() || null,
          status: form.status,
          target_date: form.target_date || null,
          milestone_id: form.milestone_id,
        });
        await stagesState.reload();
        setSuccess(`Tahap “${title}” berhasil diperbarui.`);
      } else {
        const input: RoadmapStageInput = {
          project_id: projectId,
          title,
          description: form.description.trim() || null,
          status: form.status,
          target_date: form.target_date || null,
          milestone_id: form.milestone_id,
        };
        const created = await createStage(input);
        await stagesState.reload();
        setSuccess(`Tahap “${created.title}” berhasil ditambahkan.`);
      }
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan tahap roadmap.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (stage: RoadmapStage, status: StageStatus) => {
    if (status === stage.status) return;
    if (status === 'done') {
      setDoneTarget(stage);
      return;
    }
    setNotice('');
    setSuccess('');
    try {
      await updateStage(stage.id, { status });
      await stagesState.reload();
      setSuccess(`Status tahap “${stage.title}” diubah menjadi ${stageStatusLabel(status)}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal mengubah status tahap.');
    }
  };

  const confirmDone = async () => {
    if (!doneTarget || doneBusy) return;
    setDoneBusy(true);
    setNotice('');
    setSuccess('');
    try {
      await updateStage(doneTarget.id, { status: 'done' });
      const title = doneTarget.title;
      setDoneTarget(null);
      await stagesState.reload();
      setSuccess(`Tahap “${title}” ditandai selesai atas konfirmasi.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menandai tahap selesai.');
    } finally {
      setDoneBusy(false);
    }
  };

  const moveStage = async (stage: RoadmapStage, direction: -1 | 1) => {
    if (reorderBusy) return;
    const index = stages.findIndex((item) => item.id === stage.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) return;

    const next = [...stages];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setReorderBusy(true);
    setNotice('');
    setSuccess('');
    try {
      await Promise.all(next.map((item, order) => updateStage(item.id, { position: order + 1 })));
      await stagesState.reload();
      setSuccess('Urutan tahap berhasil disimpan.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menyimpan urutan tahap.');
    } finally {
      setReorderBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const title = deleteTarget.title;
      await deleteStage(deleteTarget.id);
      setDeleteTarget(null);
      await stagesState.reload();
      setSuccess(`Tahap “${title}” diarsipkan. Tugas terkait tidak dihapus.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus tahap.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (projectsState.loading && !projectsState.data) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat roadmap..." />
      </div>
    );
  }

  if (projectsState.error && !projectsState.data) {
    return (
      <div className="space-y-4">
        <PageHeader icon={Map} title="Roadmap" description="Rencana tahapan dan target per proyek." />
        <PageError message={projectsState.error} onRetry={() => void projectsState.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Map}
        title="Roadmap"
        description="Kelola tahapan nyata per proyek: urutan, status, target tanggal, milestone, dan progres dari tugas terkait."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreate} disabled={projects.length === 0}>
          <Plus size={14} aria-hidden /> Tambah tahap
        </Button>
      </PageHeader>

      {projectsState.error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <Button variant="primary" onClick={() => void projectsState.reload()}>
              Coba lagi
            </Button>
          }
        >
          {projectsState.error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      {stagesState.error ? (
        <ApiNotice tone="error" title="Roadmap proyek tidak dapat dimuat">
          {stagesState.error}
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

      {projects.length === 0 ? (
        <EmptyState icon={Map} title="Belum ada proyek">
          Roadmap membutuhkan proyek. Tambah proyek terlebih dahulu dari halaman Proyek.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Tahap" value={stages.length} icon={Map} tone="brand" />
            <StatTile label="Selesai" value={counts.done} icon={CheckCircle2} tone="aqua" />
            <StatTile label="In Progress" value={counts.inProgress} tone="sun" />
            <StatTile label="Blocked" value={counts.blocked} tone="coral" />
          </div>

          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                Pilih proyek
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(Number(event.target.value))}
                  className="mt-1 w-full rounded-[10px] border border-line bg-soft px-2.5 py-2 text-[11.5px] font-normal normal-case tracking-normal text-ink outline-none focus:ring-2 focus:ring-brand/20 sm:max-w-[420px]"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProject ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedProject.status} />
                  <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted">
                    {selectedProject.total} tugas
                  </span>
                </div>
              ) : null}
            </div>

            {selectedProject ? (
              <div className="mt-3 rounded-[14px] bg-soft2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-ink">{selectedProject.name}</p>
                  <span className="text-[10px] font-semibold text-muted">
                    {selectedProject.progress === null
                      ? 'Belum ada tugas'
                      : `${selectedProject.progress}% tugas selesai`}
                  </span>
                </div>
                <ProgressBar
                  value={selectedProject.progress}
                  className="mt-2"
                  label={`Progres tugas ${selectedProject.name}`}
                />
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  Progres proyek dihitung dari tugas berstatus done. Progres tahap dihitung dari tugas yang
                  terhubung ke tahap tersebut.
                </p>
              </div>
            ) : null}
          </Card>

          <section aria-labelledby="roadmap-stages-heading">
            <SectionHeader
              id="roadmap-stages-heading"
              title="Tahapan roadmap"
              subtitle="Urutan dan status tersimpan di database"
              aside={
                <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
                  {filteredStages.length}
                </span>
              }
            />

            {stagesState.loading && !stagesState.data ? (
              <PageLoading label="Memuat tahapan..." />
            ) : filteredStages.length === 0 ? (
              <EmptyState icon={Map} title={stages.length === 0 ? 'Belum ada tahap roadmap' : 'Tidak ada tahap yang cocok'}>
                {stages.length === 0
                  ? 'Tambahkan tahap pertama untuk proyek ini. Tahap tidak ditandai selesai secara otomatis.'
                  : 'Ubah kata kunci pencarian untuk melihat tahap lain.'}
              </EmptyState>
            ) : (
              <ol className="space-y-2.5">
                {filteredStages.map((stage, index) => (
                  <li
                    key={stage.id}
                    className="rounded-[16px] border border-line bg-card p-3.5 shadow-cardLift"
                  >
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brandSoft text-[11px] font-extrabold text-brand">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-[12.5px] font-bold leading-snug text-ink">
                                {stage.title}
                              </h3>
                              <StatusBadge status={stage.status} />
                            </div>
                            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                              {stage.description ?? 'Belum ada deskripsi tahap.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              variant="ghost"
                              onClick={() => void moveStage(stage, -1)}
                              disabled={reorderBusy || index === 0}
                              aria-label={`Naikkan ${stage.title}`}
                              className="px-2 py-1"
                            >
                              <ArrowUp size={12} aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => void moveStage(stage, 1)}
                              disabled={reorderBusy || index === stages.length - 1}
                              aria-label={`Turunkan ${stage.title}`}
                              className="px-2 py-1"
                            >
                              <ArrowDown size={12} aria-hidden />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9.5px] font-semibold text-muted">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full bg-soft px-2 py-1 ${
                              isOverdue(stage.target_date) && stage.status !== 'done' ? 'text-coral' : ''
                            }`}
                          >
                            <CalendarDays size={10} aria-hidden /> {formatDate(stage.target_date)}
                          </span>
                          {stage.milestone_title ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sunSoft px-2 py-1 text-[#8a6410] dark:text-amber-200">
                              <Flag size={10} aria-hidden /> {stage.milestone_title}
                            </span>
                          ) : (
                            <span className="rounded-full bg-soft px-2 py-1">Tanpa milestone</span>
                          )}
                          <span className="rounded-full bg-soft px-2 py-1">
                            {stage.task_total > 0
                              ? `${stage.task_done}/${stage.task_total} tugas`
                              : 'Belum ada tugas'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <ProgressBar
                            value={stage.progress}
                            className="flex-1"
                            label={`Progres tahap ${stage.title}`}
                          />
                          <span className="w-9 text-right text-[9.5px] font-bold text-muted">
                            {stage.progress === null ? '—' : `${stage.progress}%`}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                            Status
                            <select
                              value={stage.status}
                              onChange={(event) =>
                                void changeStatus(stage, event.target.value as StageStatus)
                              }
                              className="rounded-[8px] border border-line bg-soft px-2 py-1 text-[10.5px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
                            >
                              {stageStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button variant="secondary" onClick={() => openEdit(stage)} className="px-2 py-1">
                            <Pencil size={11} aria-hidden /> Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDeleteTarget(stage)}
                            className="px-2 py-1"
                          >
                            <Trash2 size={11} aria-hidden /> Hapus
                          </Button>
                          {stage.status === 'done' ? (
                            <span className="text-[9.5px] text-muted">
                              Selesai dikonfirmasi; bukan otomatis dari tanggal.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="roadmap-milestones-heading">
            <SectionHeader
              id="roadmap-milestones-heading"
              title="Milestone proyek"
              subtitle="Dipakai sebagai relasi tahap"
              aside={
                <a
                  href="#/milestone"
                  className="rounded-full bg-brandSoft px-2 py-1 text-[9.5px] font-bold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Kelola milestone
                </a>
              }
            />

            {milestonesState.loading && !milestonesState.data ? (
              <PageLoading label="Memuat milestone..." />
            ) : milestones.length === 0 ? (
              <EmptyState icon={Flag} title="Belum ada milestone untuk proyek ini">
                Tambahkan milestone dari halaman Milestone agar dapat dihubungkan ke tahap roadmap.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-card px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-sunSoft text-[#8a6410] dark:text-amber-200">
                      <Target size={12} aria-hidden />
                    </span>
                    <p className="min-w-0 flex-1 break-words text-[11px] font-semibold text-ink">
                      {milestone.title}
                    </p>
                    <StatusBadge status={milestone.status} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-1 text-[9px] font-bold text-muted">
                      <CalendarDays size={10} aria-hidden /> {formatDate(milestone.target_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={modal !== null}
        title={modal === 'edit' ? 'Edit tahap roadmap' : 'Tambah tahap roadmap'}
        description={
          modal === 'edit'
            ? 'Perubahan disimpan melalui PATCH /roadmap/{id}.'
            : 'Tahap baru disimpan melalui POST /roadmap dan dapat diurutkan setelah dibuat.'
        }
        onClose={() => {
          if (!busy) setModal(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="stage-form" disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {busy ? 'Menyimpan...' : 'Simpan tahap'}
            </Button>
          </>
        }
      >
        <form id="stage-form" onSubmit={requestSave} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama tahap" htmlFor="stage-title" className="sm:col-span-2">
            <input
              id="stage-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={255}
              required
              autoFocus
              placeholder="Contoh: Audit sistem"
              className={fieldControl}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="stage-description" className="sm:col-span-2">
            <textarea
              id="stage-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              placeholder="Apa yang harus dicapai pada tahap ini?"
              className={fieldControl}
            />
          </Field>
          <Field label="Status" htmlFor="stage-status">
            <select
              id="stage-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as StageStatus }))
              }
              className={fieldControl}
            >
              {stageStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target tanggal" htmlFor="stage-target">
            <input
              id="stage-target"
              type="date"
              value={form.target_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, target_date: event.target.value }))
              }
              className={fieldControl}
            />
          </Field>
          <Field
            label="Milestone"
            htmlFor="stage-milestone"
            hint="Opsional. Hanya milestone proyek ini yang dapat dipilih."
            className="sm:col-span-2"
          >
            <select
              id="stage-milestone"
              value={form.milestone_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  milestone_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className={fieldControl}
            >
              <option value="">Tanpa milestone</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.title}
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
        open={pendingDoneSave}
        title="Tandai tahap selesai?"
        confirmLabel="Tandai selesai"
        tone="primary"
        busy={busy}
        onClose={() => setPendingDoneSave(false)}
        onConfirm={() => void persistSave()}
        message={
          <>
            Tahap <b>{form.title.trim() || 'ini'}</b> akan ditandai selesai. Progres tahap tetap dihitung dari
            tugas terkait; status selesai tidak dibuat otomatis dari tanggal.
          </>
        }
      />

      <ConfirmDialog
        open={doneTarget !== null}
        title="Tandai tahap selesai?"
        confirmLabel="Tandai selesai"
        tone="primary"
        busy={doneBusy}
        onClose={() => {
          if (!doneBusy) setDoneTarget(null);
        }}
        onConfirm={() => void confirmDone()}
        message={
          <>
            Tahap <b>{doneTarget?.title}</b> akan ditandai selesai atas konfirmasi Anda. Saat ini{' '}
            <b>{doneTarget?.task_done ?? 0}</b> dari <b>{doneTarget?.task_total ?? 0}</b> tugas terkait sudah
            selesai.
          </>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Arsipkan tahap roadmap?"
        confirmLabel="Arsipkan tahap"
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
        message={
          <>
            Tahap <b>{deleteTarget?.title}</b> akan diarsipkan. Tugas yang pernah terhubung tidak dihapus; relasi
            tahap pada tugas lama tetap tersimpan sebagai data historis.
          </>
        }
      />
    </div>
  );
}
