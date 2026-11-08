import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  History,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createSession,
  deleteSession,
  getSessions,
  getTasks,
  updateSession,
  updateTask,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import { getHashParams, useHash } from '../navigation';
import {
  Card,
  EmptyState,
  PriorityBadge,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { Button, ConfirmDialog, Field, Modal, fieldControl } from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type { WorkSession, WorkSessionInput } from '../types';
import { formatDate, formatDateTime, nowLocalDateTime, toDateTimeLocal } from '../utils';

type SessionForm = {
  started_at: string;
  ended_at: string;
  summary: string;
  result: string;
  blockers: string;
  next_step: string;
  file_refs: string;
};

const emptyForm: SessionForm = {
  started_at: '',
  ended_at: '',
  summary: '',
  result: '',
  blockers: '',
  next_step: '',
  file_refs: '',
};

function SessionCard({
  session,
  onEdit,
  onDelete,
}: {
  session: WorkSession;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-[14px] border border-line bg-card p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            <Clock size={11} aria-hidden /> {formatDateTime(session.started_at)}
          </p>
          <p className="mt-1 text-[10px] font-medium text-muted">
            Selesai: {formatDateTime(session.ended_at)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" onClick={onEdit} className="px-2 py-1">
            <Pencil size={11} aria-hidden /> Edit
          </Button>
          <Button variant="danger" onClick={onDelete} className="px-2 py-1">
            <Trash2 size={11} aria-hidden /> Hapus
          </Button>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {session.summary ? (
          <div className="sm:col-span-2">
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Ringkasan</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink">
              {session.summary}
            </dd>
          </div>
        ) : null}
        {session.result ? (
          <div>
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Hasil</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink">
              {session.result}
            </dd>
          </div>
        ) : null}
        {session.blockers ? (
          <div>
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Kendala</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink">
              {session.blockers}
            </dd>
          </div>
        ) : null}
        {session.next_step ? (
          <div>
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Langkah berikutnya</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink">
              {session.next_step}
            </dd>
          </div>
        ) : null}
        {session.file_refs ? (
          <div className="sm:col-span-2">
            <dt className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
              <FileText size={10} aria-hidden /> Referensi file
            </dt>
            <dd className="mt-0.5 break-words font-mono text-[10.5px] leading-relaxed text-ink">
              {session.file_refs}
            </dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

export default function JourneyPage({ query }: { query: string }) {
  const tasksState = useApiData(() => getTasks(), []);
  const sessionsState = useApiData(() => getSessions({ limit: 200 }), []);
  const hash = useHash();
  const requestedId = useMemo(() => {
    const raw = Number(getHashParams(hash).get('task'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [hash]);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkSession | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');

  const tasks = tasksState.data ?? [];
  const sessions = sessionsState.data ?? [];
  const requestedTask =
    requestedId === null ? null : tasks.find((task) => task.id === requestedId) ?? null;
  const selected =
    requestedTask ??
    (requestedId === null
      ? tasks.find((task) => task.status === 'in_progress') ?? tasks[0] ?? null
      : null);
  const missingRequested = requestedId !== null && !tasksState.loading && tasksState.data !== null && !requestedTask;

  useEffect(() => {
    setModal(null);
    setEditingSession(null);
  }, [selected?.id]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) =>
      [task.title, task.project, task.note, task.next_step, task.blocked_reason].some((value) =>
        (value ?? '').toLowerCase().includes(q),
      ),
    );
  }, [query, tasks]);

  const selectedSessions = useMemo(
    () => (selected ? sessions.filter((session) => session.task_id === selected.id) : []),
    [selected, sessions],
  );

  const openCreate = () => {
    setEditingSession(null);
    setForm({
      ...emptyForm,
      started_at: nowLocalDateTime(),
      next_step: selected?.next_step ?? '',
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('create');
  };

  const openEdit = (session: WorkSession) => {
    setEditingSession(session);
    setForm({
      started_at: toDateTimeLocal(session.started_at),
      ended_at: toDateTimeLocal(session.ended_at),
      summary: session.summary ?? '',
      result: session.result ?? '',
      blockers: session.blockers ?? '',
      next_step: session.next_step ?? '',
      file_refs: session.file_refs ?? '',
    });
    setFormError('');
    setNotice('');
    setSuccess('');
    setModal('edit');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !selected) return;
    setFormError('');
    setNotice('');
    setSuccess('');

    if (!form.started_at) {
      setFormError('Waktu mulai sesi wajib diisi.');
      return;
    }
    if (form.ended_at && new Date(form.ended_at) < new Date(form.started_at)) {
      setFormError('Waktu selesai tidak boleh lebih awal dari waktu mulai.');
      return;
    }

    const payload: WorkSessionInput = {
      task_id: selected.id,
      project_id: selected.project_id,
      started_at: form.started_at,
      ended_at: form.ended_at || null,
      summary: form.summary.trim() || null,
      result: form.result.trim() || null,
      blockers: form.blockers.trim() || null,
      next_step: form.next_step.trim() || null,
      file_refs: form.file_refs.trim() || null,
    };

    setBusy(true);
    try {
      if (modal === 'edit' && editingSession) {
        await updateSession(editingSession.id, payload);
        await sessionsState.reload();
        setSuccess(`Catatan sesi #${editingSession.id} berhasil diperbarui.`);
      } else {
        const created = await createSession(payload);
        await sessionsState.reload();
        setSuccess(`Catatan sesi #${created.id} berhasil disimpan untuk tugas #${selected.id}.`);
      }
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan catatan sesi.');
    } finally {
      setBusy(false);
    }
  };

  const markInProgress = async () => {
    if (!selected || statusBusy || selected.status === 'in_progress') return;
    setStatusBusy(true);
    setNotice('');
    setSuccess('');
    try {
      await updateTask(selected.id, { status: 'in_progress' });
      await tasksState.reload();
      setSuccess(`Tugas #${selected.id} sekarang berstatus In Progress.`);
      window.location.hash = `#/perjalanan?task=${selected.id}`;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal memperbarui status tugas.');
    } finally {
      setStatusBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const id = deleteTarget.id;
      await deleteSession(id);
      setDeleteTarget(null);
      await sessionsState.reload();
      setSuccess(`Catatan sesi #${id} diarsipkan.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus catatan sesi.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (
    tasksState.loading &&
    !tasksState.data &&
    sessionsState.loading &&
    !sessionsState.data
  ) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat catatan pekerjaan..." />
      </div>
    );
  }

  if (tasksState.error && !tasksState.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={History}
          title="Perjalanan"
          description="Catatan sesi kerja dan titik lanjut dari tugas."
        />
        <PageError message={tasksState.error} onRetry={() => void tasksState.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={History}
        title="Perjalanan"
        description="Pilih tugas, catat sesi kerja, simpan hasil/kendala/langkah berikutnya, lalu buka kembali catatan setelah reload."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreate} disabled={!selected}>
          <Plus size={14} aria-hidden /> Catat sesi
        </Button>
      </PageHeader>

      {tasksState.error ? (
        <ApiNotice
          tone="error"
          title="Daftar tugas tidak dapat dimuat"
          action={
            <Button variant="primary" onClick={() => void tasksState.reload()}>
              Coba lagi
            </Button>
          }
        >
          {tasksState.error}
        </ApiNotice>
      ) : null}

      {sessionsState.error ? (
        <ApiNotice tone="warning" title="Riwayat sesi tidak dapat dimuat">
          {sessionsState.error}. Catatan baru tetap dapat dicoba, tetapi riwayat mungkin belum lengkap.
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
        <StatTile label="Tugas" value={tasks.length} icon={History} tone="brand" />
        <StatTile
          label="In Progress"
          value={tasks.filter((task) => task.status === 'in_progress').length}
          icon={Play}
          tone="aqua"
        />
        <StatTile
          label="Blocked"
          value={tasks.filter((task) => task.status === 'blocked').length}
          tone="coral"
        />
        <StatTile label="Catatan sesi" value={sessions.length} icon={Clock} tone="sun" />
      </div>

      {missingRequested ? (
        <ApiNotice tone="warning" title="Tugas tidak ditemukan">
          Tugas dengan ID {requestedId} tidak ada atau sudah diarsipkan.{' '}
          <a href="#/tasks" className="font-bold text-brand underline-offset-2 hover:underline">
            Buka Tasks
          </a>
        </ApiNotice>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState icon={History} title="Belum ada tugas">
          Tambahkan tugas terlebih dahulu dari halaman Tasks agar sesi kerja dapat dicatat.
          <span className="mt-3 block">
            <a
              href="#/tasks"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3 py-2 text-[11px] font-bold text-white hover:bg-brandDeep"
            >
              Buka Tasks <ArrowRight size={13} aria-hidden />
            </a>
          </span>
        </EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <section aria-labelledby="journey-list-heading">
            <SectionHeader
              id="journey-list-heading"
              title="Pekerjaan"
              subtitle="Pilih tugas untuk melihat dan mencatat sesi"
              aside={
                <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
                  {filteredTasks.length}
                </span>
              }
            />

            {filteredTasks.length === 0 ? (
              <EmptyState icon={History} title="Tidak ada tugas yang cocok">
                Ubah kata kunci pencarian.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {filteredTasks.map((task) => {
                  const active = selected?.id === task.id;
                  return (
                    <li key={task.id}>
                      <a
                        href={`#/perjalanan?task=${task.id}`}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-[14px] border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          active ? 'border-brand/40 bg-brandSoft' : 'border-line bg-card hover:bg-soft2'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-[11.5px] font-bold leading-snug text-ink">
                            {task.title}
                          </p>
                          <StatusBadge status={task.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <p className="text-[9.5px] font-medium text-muted">
                            {task.project} · #{task.id}
                          </p>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        {task.next_step ? (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">
                            Berikutnya: {task.next_step}
                          </p>
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="journey-detail-heading">
            <SectionHeader
              id="journey-detail-heading"
              title="Catatan pekerjaan"
              subtitle="Sesi tersimpan di tabel work_sessions"
              aside={
                selected ? (
                  <Button variant="secondary" onClick={openCreate} className="px-2 py-1">
                    <Plus size={11} aria-hidden /> Sesi baru
                  </Button>
                ) : undefined
              }
            />

            {selected ? (
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                      Tugas #{selected.id}
                    </p>
                    <h2 className="mt-1 break-words text-[18px] font-bold leading-snug tracking-[-0.01em] text-ink">
                      {selected.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-muted">
                      <span>{selected.project}</span>
                      <PriorityBadge priority={selected.priority} />
                      {selected.stage_title ? (
                        <span className="rounded-full bg-soft px-2 py-0.5 text-[9px] font-bold text-muted">
                          {selected.stage_title}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] bg-soft2 p-3">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Proyek</dt>
                    <dd className="mt-1 text-[11.5px] font-semibold text-ink">{selected.project}</dd>
                  </div>
                  <div className="rounded-[14px] bg-soft2 p-3">
                    <dt className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                      <CalendarDays size={10} aria-hidden /> Target tugas
                    </dt>
                    <dd className="mt-1 text-[11.5px] font-semibold text-ink">
                      {formatDate(selected.target_date)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Catatan tugas</p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-[12px] border border-line bg-card px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">
                      {selected.note ?? 'Belum ada catatan hasil.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Langkah berikutnya</p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-[12px] border border-line bg-card px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">
                      {selected.next_step ?? 'Belum ditentukan.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
                      Kendala / belum selesai
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-[12px] border border-line bg-card px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">
                      {selected.blocked_reason ?? 'Tidak ada kendala yang tercatat.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {selected.status === 'in_progress' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-aquaSoft px-3 py-2 text-[10.5px] font-bold text-[#0e6b7b] dark:text-cyan-200">
                      <Play size={13} aria-hidden /> Sedang dikerjakan
                    </span>
                  ) : (
                    <Button onClick={() => void markInProgress()} disabled={statusBusy} aria-busy={statusBusy}>
                      {statusBusy ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden />
                      ) : (
                        <Play size={13} aria-hidden />
                      )}
                      {statusBusy ? 'Memperbarui...' : 'Tandai In Progress'}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={openCreate}>
                    <Plus size={13} aria-hidden /> Catat sesi
                  </Button>
                  <a
                    href="#/tasks"
                    className="inline-flex items-center gap-1 rounded-[10px] bg-soft px-3 py-2 text-[10.5px] font-bold text-brand transition-colors hover:bg-brandSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Ubah tugas <ArrowRight size={12} aria-hidden />
                  </a>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <SectionHeader
                    title="Riwayat sesi"
                    subtitle={`${selectedSessions.length} catatan untuk tugas ini`}
                  />
                  {sessionsState.loading && !sessionsState.data ? (
                    <p className="flex items-center gap-2 text-[11px] text-muted" role="status">
                      <Loader2 size={13} className="animate-spin" aria-hidden /> Memuat riwayat...
                    </p>
                  ) : selectedSessions.length === 0 ? (
                    <EmptyState icon={Clock} title="Belum ada sesi kerja">
                      Catat sesi pertama untuk menyimpan ringkasan, hasil, kendala, dan langkah berikutnya.
                    </EmptyState>
                  ) : (
                    <ul className="space-y-2.5">
                      {selectedSessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onEdit={() => openEdit(session)}
                          onDelete={() => setDeleteTarget(session)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            ) : (
              <EmptyState icon={History} title="Pilih tugas">
                Pilih salah satu tugas untuk melihat dan mencatat sesi pekerjaannya.
              </EmptyState>
            )}
          </section>
        </div>
      )}

      <Modal
        open={modal !== null}
        title={modal === 'edit' ? 'Edit sesi kerja' : 'Catat sesi kerja'}
        description={
          selected
            ? `Tugas #${selected.id} — ${selected.title}`
            : 'Pilih tugas terlebih dahulu.'
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
            <Button type="submit" form="session-form" disabled={busy || !selected} aria-busy={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {busy ? 'Menyimpan...' : 'Simpan sesi'}
            </Button>
          </>
        }
      >
        <form id="session-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Waktu mulai" htmlFor="session-start">
            <input
              id="session-start"
              type="datetime-local"
              value={form.started_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, started_at: event.target.value }))
              }
              required
              className={fieldControl}
            />
          </Field>
          <Field label="Waktu selesai" htmlFor="session-end" hint="Opsional jika sesi masih berjalan.">
            <input
              id="session-end"
              type="datetime-local"
              value={form.ended_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, ended_at: event.target.value }))
              }
              className={fieldControl}
            />
          </Field>
          <Field label="Ringkasan pekerjaan" htmlFor="session-summary" className="sm:col-span-2">
            <textarea
              id="session-summary"
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              rows={3}
              placeholder="Apa yang dikerjakan pada sesi ini?"
              className={fieldControl}
            />
          </Field>
          <Field label="Hasil terakhir" htmlFor="session-result">
            <textarea
              id="session-result"
              value={form.result}
              onChange={(event) =>
                setForm((current) => ({ ...current, result: event.target.value }))
              }
              rows={3}
              placeholder="Hasil yang sudah selesai..."
              className={fieldControl}
            />
          </Field>
          <Field label="Kendala" htmlFor="session-blockers">
            <textarea
              id="session-blockers"
              value={form.blockers}
              onChange={(event) =>
                setForm((current) => ({ ...current, blockers: event.target.value }))
              }
              rows={3}
              placeholder="Hal yang menghambat..."
              className={fieldControl}
            />
          </Field>
          <Field label="Langkah berikutnya" htmlFor="session-next" className="sm:col-span-2">
            <textarea
              id="session-next"
              value={form.next_step}
              onChange={(event) =>
                setForm((current) => ({ ...current, next_step: event.target.value }))
              }
              rows={2}
              placeholder="Apa yang harus dilakukan setelah sesi ini?"
              className={fieldControl}
            />
          </Field>
          <Field
            label="Referensi file / lokasi kode"
            htmlFor="session-files"
            hint="Contoh: src/pages/Dashboard.tsx atau catatan desain."
            className="sm:col-span-2"
          >
            <input
              id="session-files"
              value={form.file_refs}
              onChange={(event) =>
                setForm((current) => ({ ...current, file_refs: event.target.value }))
              }
              placeholder="src/components/..., docs/..."
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
        open={deleteTarget !== null}
        title="Arsipkan catatan sesi?"
        confirmLabel="Arsipkan sesi"
        busy={deleteBusy}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
        message={
          <>
            Catatan sesi <b>#{deleteTarget?.id}</b> akan diarsipkan dan tidak lagi tampil di riwayat. Data
            tugas dan proyek tidak berubah.
          </>
        }
      />
    </div>
  );
}
