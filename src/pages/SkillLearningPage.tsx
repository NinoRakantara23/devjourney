import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BookOpen,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Target,
} from 'lucide-react';
import {
  createNote,
  createResource,
  createSkill,
  deleteNote,
  deleteResource,
  deleteSkill,
  getProjects,
  getSkill,
  getSkills,
  updateNote,
  updateResource,
  updateSkill,
} from '../api';
import { useApiData } from '../hooks/useApiData';
import { getHashParams, useHash } from '../navigation';
import {
  Card,
  EmptyState,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { Button, ConfirmDialog, Field, Modal, fieldControl } from '../components/form';
import { ApiNotice, PageError, PageHeader, PageLoading, StatTile } from '../components/page';
import type {
  LearningResource,
  LearningResourceInput,
  ResourceStatus,
  ResourceType,
  Skill,
  SkillInput,
  SkillNote,
  SkillStatus,
} from '../types';
import { formatDate } from '../utils';

const skillStatusOptions: { value: SkillStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'learning', label: 'Learning' },
  { value: 'practicing', label: 'Practicing' },
  { value: 'completed', label: 'Completed' },
];

const resourceTypeOptions: { value: ResourceType; label: string }[] = [
  { value: 'course', label: 'Course' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'book', label: 'Book' },
  { value: 'other', label: 'Other' },
];

const resourceStatusOptions: { value: ResourceStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const skillStatusFilters = ['all', 'not_started', 'learning', 'practicing', 'completed'] as const;
type SkillStatusFilter = (typeof skillStatusFilters)[number];

type SkillForm = {
  name: string;
  description: string;
  target: string;
  status: SkillStatus;
  progress: number;
  notes: string;
  project_id: number | null;
};

type ResourceForm = {
  title: string;
  url: string;
  type: ResourceType;
  status: ResourceStatus;
  notes: string;
};

const emptySkillForm: SkillForm = {
  name: '',
  description: '',
  target: '',
  status: 'not_started',
  progress: 0,
  notes: '',
  project_id: null,
};

const emptyResourceForm: ResourceForm = {
  title: '',
  url: '',
  type: 'course',
  status: 'planned',
  notes: '',
};

function skillStatusLabel(status: SkillStatus) {
  return skillStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function resourceTypeLabel(type: ResourceType) {
  return resourceTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export default function SkillLearningPage({ query }: { query: string }) {
  const skillsState = useApiData(() => getSkills(), []);
  const projectsState = useApiData(() => getProjects(), []);
  const hash = useHash();
  const requestedId = useMemo(() => {
    const raw = Number(getHashParams(hash).get('skill'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [hash]);

  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | number>('all');
  const [skillModal, setSkillModal] = useState<'create' | 'edit' | null>(null);
  const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
  const [skillFormError, setSkillFormError] = useState('');
  const [skillBusy, setSkillBusy] = useState(false);
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<Skill | null>(null);
  const [deleteSkillBusy, setDeleteSkillBusy] = useState(false);

  const [resourceModal, setResourceModal] = useState<'create' | 'edit' | null>(null);
  const [editingResource, setEditingResource] = useState<LearningResource | null>(null);
  const [resourceForm, setResourceForm] = useState<ResourceForm>(emptyResourceForm);
  const [resourceFormError, setResourceFormError] = useState('');
  const [resourceBusy, setResourceBusy] = useState(false);
  const [deleteResourceTarget, setDeleteResourceTarget] = useState<LearningResource | null>(null);
  const [deleteResourceBusy, setDeleteResourceBusy] = useState(false);

  const [noteModal, setNoteModal] = useState<'create' | 'edit' | null>(null);
  const [editingNote, setEditingNote] = useState<SkillNote | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteFormError, setNoteFormError] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<SkillNote | null>(null);
  const [deleteNoteBusy, setDeleteNoteBusy] = useState(false);

  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');

  const skills = skillsState.data ?? [];
  const projects = projectsState.data ?? [];
  const selected =
    requestedId !== null
      ? skills.find((skill) => skill.id === requestedId) ?? null
      : skills[0] ?? null;
  const effectiveId = selected?.id ?? null;
  const detailState = useApiData(
    () => (effectiveId ? getSkill(effectiveId) : Promise.resolve(null)),
    [effectiveId],
  );
  const missingRequested = requestedId !== null && !skillsState.loading && skillsState.data !== null && !selected;

  useEffect(() => {
    if (!skillsState.loading && skillsState.data !== null && skills.length > 0 && requestedId === null) {
      window.history.replaceState(null, '', `#/skill-learning?skill=${skills[0].id}`);
    }
  }, [requestedId, skills, skillsState.data, skillsState.loading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const matchesQuery =
        q === '' ||
        [skill.name, skill.description, skill.target, skill.notes, skill.project].some((value) =>
          (value ?? '').toLowerCase().includes(q),
        );
      const matchesStatus = statusFilter === 'all' || skill.status === statusFilter;
      const matchesProject = projectFilter === 'all' || skill.project_id === projectFilter;
      return matchesQuery && matchesStatus && matchesProject;
    });
  }, [projectFilter, query, skills, statusFilter]);

  const resourceTotal = skills.reduce((total, skill) => total + skill.resource_total, 0);
  const detail = detailState.data;

  const openCreateSkill = () => {
    setSkillForm({ ...emptySkillForm, project_id: projectFilter === 'all' ? null : projectFilter });
    setSkillFormError('');
    setNotice('');
    setSuccess('');
    setSkillModal('create');
  };

  const openEditSkill = (skill: Skill) => {
    setSkillForm({
      name: skill.name,
      description: skill.description ?? '',
      target: skill.target ?? '',
      status: skill.status,
      progress: skill.progress,
      notes: skill.notes ?? '',
      project_id: skill.project_id,
    });
    setSkillFormError('');
    setNotice('');
    setSuccess('');
    setSkillModal('edit');
  };

  const saveSkill = async (event: FormEvent) => {
    event.preventDefault();
    if (skillBusy) return;
    const name = skillForm.name.trim();
    setSkillFormError('');
    setNotice('');
    setSuccess('');

    if (!name) {
      setSkillFormError('Nama skill wajib diisi.');
      return;
    }
    if (name.length > 150) {
      setSkillFormError('Nama skill maksimal 150 karakter.');
      return;
    }
    if (skillForm.progress < 0 || skillForm.progress > 100) {
      setSkillFormError('Progres harus antara 0 dan 100.');
      return;
    }

    const payload: SkillInput = {
      name,
      description: skillForm.description.trim() || null,
      target: skillForm.target.trim() || null,
      status: skillForm.status,
      progress: skillForm.progress,
      notes: skillForm.notes.trim() || null,
      project_id: skillForm.project_id,
    };

    setSkillBusy(true);
    try {
      if (skillModal === 'edit' && selected) {
        await updateSkill(selected.id, payload);
        await skillsState.reload();
        await detailState.reload();
        setSuccess(`Skill “${name}” berhasil diperbarui.`);
      } else {
        const created = await createSkill(payload);
        await skillsState.reload();
        window.location.hash = `#/skill-learning?skill=${created.id}`;
        setSuccess(`Skill “${created.name}” berhasil dibuat.`);
      }
      setSkillModal(null);
    } catch (err) {
      setSkillFormError(err instanceof Error ? err.message : 'Gagal menyimpan skill.');
    } finally {
      setSkillBusy(false);
    }
  };

  const removeSkill = async () => {
    if (!deleteSkillTarget || deleteSkillBusy) return;
    setDeleteSkillBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const name = deleteSkillTarget.name;
      await deleteSkill(deleteSkillTarget.id);
      setDeleteSkillTarget(null);
      await skillsState.reload();
      window.history.replaceState(null, '', '#/skill-learning');
      setSuccess(`Skill “${name}” diarsipkan. Materi dan catatan terkait tetap tersimpan.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus skill.');
    } finally {
      setDeleteSkillBusy(false);
    }
  };

  const openCreateResource = () => {
    setEditingResource(null);
    setResourceForm(emptyResourceForm);
    setResourceFormError('');
    setResourceModal('create');
  };

  const openEditResource = (resource: LearningResource) => {
    setEditingResource(resource);
    setResourceForm({
      title: resource.title,
      url: resource.url ?? '',
      type: resource.type,
      status: resource.status,
      notes: resource.notes ?? '',
    });
    setResourceFormError('');
    setResourceModal('edit');
  };

  const saveResource = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || resourceBusy) return;
    const title = resourceForm.title.trim();
    setResourceFormError('');
    setNotice('');
    setSuccess('');

    if (!title) {
      setResourceFormError('Judul materi wajib diisi.');
      return;
    }
    if (title.length > 255) {
      setResourceFormError('Judul materi maksimal 255 karakter.');
      return;
    }

    const payload: LearningResourceInput = {
      title,
      url: resourceForm.url.trim() || null,
      type: resourceForm.type,
      status: resourceForm.status,
      notes: resourceForm.notes.trim() || null,
    };

    setResourceBusy(true);
    try {
      if (resourceModal === 'edit' && editingResource) {
        await updateResource(editingResource.id, payload);
        setSuccess(`Materi “${title}” berhasil diperbarui.`);
      } else {
        await createResource(selected.id, payload);
        setSuccess(`Materi “${title}” berhasil ditambahkan.`);
      }
      await detailState.reload();
      await skillsState.reload();
      setResourceModal(null);
    } catch (err) {
      setResourceFormError(err instanceof Error ? err.message : 'Gagal menyimpan materi.');
    } finally {
      setResourceBusy(false);
    }
  };

  const changeResourceStatus = async (resource: LearningResource, status: ResourceStatus) => {
    if (status === resource.status) return;
    setNotice('');
    setSuccess('');
    try {
      await updateResource(resource.id, { status });
      await detailState.reload();
      await skillsState.reload();
      setSuccess(`Status materi “${resource.title}” diubah.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal mengubah status materi.');
    }
  };

  const removeResource = async () => {
    if (!deleteResourceTarget || deleteResourceBusy) return;
    setDeleteResourceBusy(true);
    setNotice('');
    setSuccess('');
    try {
      const title = deleteResourceTarget.title;
      await deleteResource(deleteResourceTarget.id);
      setDeleteResourceTarget(null);
      await detailState.reload();
      await skillsState.reload();
      setSuccess(`Materi “${title}” diarsipkan.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus materi.');
    } finally {
      setDeleteResourceBusy(false);
    }
  };

  const openCreateNote = () => {
    setEditingNote(null);
    setNoteText('');
    setNoteFormError('');
    setNoteModal('create');
  };

  const openEditNote = (note: SkillNote) => {
    setEditingNote(note);
    setNoteText(note.note);
    setNoteFormError('');
    setNoteModal('edit');
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || noteBusy) return;
    const text = noteText.trim();
    setNoteFormError('');
    setNotice('');
    setSuccess('');

    if (!text) {
      setNoteFormError('Catatan wajib diisi.');
      return;
    }

    setNoteBusy(true);
    try {
      if (noteModal === 'edit' && editingNote) {
        await updateNote(editingNote.id, text);
        setSuccess('Catatan belajar berhasil diperbarui.');
      } else {
        await createNote(selected.id, text);
        setSuccess('Catatan belajar berhasil ditambahkan.');
      }
      await detailState.reload();
      await skillsState.reload();
      setNoteModal(null);
    } catch (err) {
      setNoteFormError(err instanceof Error ? err.message : 'Gagal menyimpan catatan.');
    } finally {
      setNoteBusy(false);
    }
  };

  const removeNote = async () => {
    if (!deleteNoteTarget || deleteNoteBusy) return;
    setDeleteNoteBusy(true);
    setNotice('');
    setSuccess('');
    try {
      await deleteNote(deleteNoteTarget.id);
      setDeleteNoteTarget(null);
      await detailState.reload();
      await skillsState.reload();
      setSuccess('Catatan belajar diarsipkan.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menghapus catatan.');
    } finally {
      setDeleteNoteBusy(false);
    }
  };

  if (skillsState.loading && !skillsState.data) {
    return (
      <div className="space-y-4">
        <PageLoading label="Memuat skill dan materi..." />
      </div>
    );
  }

  if (skillsState.error && !skillsState.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={BookOpen}
          title="Skill & Learning"
          description="Kelola skill, target belajar, materi, progres, dan catatan."
        />
        <PageError message={skillsState.error} onRetry={() => void skillsState.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={BookOpen}
        title="Skill & Learning"
        description="Kelola skill, target belajar, materi/sumber, status, progres, catatan, dan hubungan opsional ke proyek."
        badge={
          <span className="rounded-full bg-brandSoft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-brand dark:text-violet-200">
            Data API
          </span>
        }
      >
        <Button onClick={openCreateSkill}>
          <Plus size={14} aria-hidden /> Tambah skill
        </Button>
      </PageHeader>

      {skillsState.error ? (
        <ApiNotice
          tone="error"
          title="Koneksi API bermasalah"
          action={
            <Button variant="primary" onClick={() => void skillsState.reload()}>
              Coba lagi
            </Button>
          }
        >
          {skillsState.error}. Data terakhir yang berhasil dimuat tetap ditampilkan.
        </ApiNotice>
      ) : null}

      {projectsState.error ? (
        <ApiNotice tone="warning" title="Daftar proyek tidak dapat dimuat">
          {projectsState.error}. Relasi skill ke proyek mungkin belum dapat dipilih.
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
        <StatTile label="Skill" value={skills.length} icon={GraduationCap} tone="brand" />
        <StatTile
          label="Learning"
          value={skills.filter((skill) => skill.status === 'learning').length}
          tone="aqua"
        />
        <StatTile
          label="Completed"
          value={skills.filter((skill) => skill.status === 'completed').length}
          tone="sun"
        />
        <StatTile label="Materi" value={resourceTotal} icon={BookOpen} tone="neutral" />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Filter size={14} className="text-brand" aria-hidden /> Filter skill
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as SkillStatusFilter)}
                className="rounded-[9px] border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
              >
                {skillStatusFilters.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'Semua status' : skillStatusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[10.5px] font-medium text-muted">
              Proyek
              <select
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
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
          </div>
        </div>
        {query.trim() ? (
          <p className="mt-2 text-[10.5px] text-muted">
            Pencarian aktif: <span className="font-semibold text-ink">“{query.trim()}”</span>
          </p>
        ) : null}
      </Card>

      {missingRequested ? (
        <ApiNotice tone="warning" title="Skill tidak ditemukan">
          Skill dengan ID {requestedId} tidak ada atau sudah diarsipkan.
        </ApiNotice>
      ) : null}

      {skills.length === 0 ? (
        <EmptyState icon={BookOpen} title="Belum ada skill">
          Tambahkan skill pertama, lalu simpan target belajar, materi, progres, dan catatan.
        </EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <section aria-labelledby="skill-list-heading">
            <SectionHeader
              id="skill-list-heading"
              title="Daftar skill"
              subtitle="Pilih skill untuk melihat materi dan catatan"
              aside={
                <span className="rounded-full bg-soft px-2 py-1 text-[9.5px] font-bold text-muted" role="status">
                  {filtered.length}
                </span>
              }
            />

            {filtered.length === 0 ? (
              <EmptyState icon={BookOpen} title="Tidak ada skill yang cocok">
                Ubah filter status/proyek atau kata kunci pencarian.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {filtered.map((skill) => {
                  const active = selected?.id === skill.id;
                  return (
                    <li key={skill.id}>
                      <a
                        href={`#/skill-learning?skill=${skill.id}`}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-[14px] border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          active ? 'border-brand/40 bg-brandSoft' : 'border-line bg-card hover:bg-soft2'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-[11.5px] font-bold leading-snug text-ink">
                            {skill.name}
                          </p>
                          <StatusBadge status={skill.status} />
                        </div>
                        <p className="mt-1 text-[9.5px] font-medium text-muted">
                          {skill.project ?? 'Tanpa proyek'} · {skill.resource_total} materi · {skill.note_count}{' '}
                          catatan
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <ProgressBar
                            value={skill.progress}
                            className="flex-1"
                            label={`Progres ${skill.name}`}
                          />
                          <span className="w-9 text-right text-[9.5px] font-bold text-muted">
                            {skill.progress}%
                          </span>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="skill-detail-heading">
            <SectionHeader
              id="skill-detail-heading"
              title="Detail skill"
              subtitle="Target, materi, dan catatan belajar"
            />

            {!selected ? (
              <EmptyState icon={BookOpen} title="Pilih skill">
                Pilih salah satu skill untuk melihat materi dan catatan.
              </EmptyState>
            ) : detailState.loading && !detail ? (
              <PageLoading label="Memuat detail skill..." />
            ) : detail ? (
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                      Skill #{detail.skill.id}
                    </p>
                    <h2 className="mt-1 break-words text-[20px] font-bold leading-snug tracking-[-0.01em] text-ink">
                      {detail.skill.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={detail.skill.status} />
                      {detail.skill.project ? (
                        <span className="rounded-full bg-soft px-2 py-0.5 text-[9px] font-bold text-muted">
                          {detail.skill.project}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => openEditSkill(detail.skill)}>
                      <Pencil size={13} aria-hidden /> Edit
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteSkillTarget(detail.skill)}>
                      <Trash2 size={13} aria-hidden /> Arsipkan
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-[14px] bg-soft2 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                      <Target size={11} aria-hidden /> Target belajar
                    </p>
                    <span className="text-[10px] font-semibold text-muted">{detail.skill.progress}%</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink">
                    {detail.skill.target ?? 'Target belajar belum ditentukan.'}
                  </p>
                  <ProgressBar
                    value={detail.skill.progress}
                    className="mt-2"
                    label={`Progres ${detail.skill.name}`}
                  />
                </div>

                <div className="mt-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Deskripsi</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink">
                    {detail.skill.description ?? 'Belum ada deskripsi skill.'}
                  </p>
                </div>

                {detail.skill.notes ? (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Catatan utama</p>
                    <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink">
                      {detail.skill.notes}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 border-t border-line pt-4">
                  <SectionHeader
                    title="Materi & sumber belajar"
                    subtitle={`${detail.resources.length} materi tersimpan`}
                    aside={
                      <Button variant="secondary" onClick={openCreateResource} className="px-2 py-1">
                        <Plus size={11} aria-hidden /> Materi
                      </Button>
                    }
                  />
                  {detail.resources.length === 0 ? (
                    <EmptyState icon={BookOpen} title="Belum ada materi">
                      Tambahkan course, artikel, video, atau buku untuk skill ini.
                    </EmptyState>
                  ) : (
                    <ul className="space-y-2">
                      {detail.resources.map((resource) => (
                        <li key={resource.id} className="rounded-[12px] border border-line bg-card p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-words text-[11.5px] font-bold text-ink">{resource.title}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9.5px] font-medium text-muted">
                                <span className="rounded-full bg-soft px-2 py-0.5">
                                  {resourceTypeLabel(resource.type)}
                                </span>
                                <StatusBadge status={resource.status} />
                                {resource.url ? (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                                  >
                                    Buka sumber <ExternalLink size={10} aria-hidden />
                                  </a>
                                ) : null}
                              </p>
                              {resource.notes ? (
                                <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">
                                  {resource.notes}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <select
                                value={resource.status}
                                onChange={(event) =>
                                  void changeResourceStatus(
                                    resource,
                                    event.target.value as ResourceStatus,
                                  )
                                }
                                aria-label={`Status materi ${resource.title}`}
                                className="rounded-[8px] border border-line bg-soft px-2 py-1 text-[10px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/20"
                              >
                                {resourceStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                variant="secondary"
                                onClick={() => openEditResource(resource)}
                                className="px-2 py-1"
                              >
                                <Pencil size={11} aria-hidden />
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => setDeleteResourceTarget(resource)}
                                className="px-2 py-1"
                              >
                                <Trash2 size={11} aria-hidden />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <SectionHeader
                    title="Catatan belajar"
                    subtitle={`${detail.notes.length} catatan tersimpan`}
                    aside={
                      <Button variant="secondary" onClick={openCreateNote} className="px-2 py-1">
                        <Plus size={11} aria-hidden /> Catatan
                      </Button>
                    }
                  />
                  {detail.notes.length === 0 ? (
                    <EmptyState icon={FileText} title="Belum ada catatan">
                      Simpan insight, pertanyaan, atau hasil latihan untuk skill ini.
                    </EmptyState>
                  ) : (
                    <ul className="space-y-2">
                      {detail.notes.map((note) => (
                        <li key={note.id} className="rounded-[12px] border border-line bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink">
                              {note.note}
                            </p>
                            <div className="flex flex-none items-center gap-1">
                              <Button
                                variant="secondary"
                                onClick={() => openEditNote(note)}
                                className="px-2 py-1"
                              >
                                <Pencil size={11} aria-hidden />
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => setDeleteNoteTarget(note)}
                                className="px-2 py-1"
                              >
                                <Trash2 size={11} aria-hidden />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-1 text-[9px] font-medium text-muted">
                            Diperbarui {formatDate(note.updated_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            ) : (
              <ApiNotice tone="warning" title="Detail skill tidak dapat dimuat">
                {detailState.error ?? 'Coba pilih skill lain atau muat ulang halaman.'}
              </ApiNotice>
            )}
          </section>
        </div>
      )}

      <Modal
        open={skillModal !== null}
        title={skillModal === 'edit' ? 'Edit skill' : 'Tambah skill'}
        description={
          skillModal === 'edit'
            ? 'Perubahan disimpan melalui PATCH /skills/{id}.'
            : 'Skill baru disimpan melalui POST /skills.'
        }
        onClose={() => {
          if (!skillBusy) setSkillModal(null);
        }}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSkillModal(null)} disabled={skillBusy}>
              Batal
            </Button>
            <Button type="submit" form="skill-form" disabled={skillBusy} aria-busy={skillBusy}>
              {skillBusy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {skillBusy ? 'Menyimpan...' : 'Simpan skill'}
            </Button>
          </>
        }
      >
        <form id="skill-form" onSubmit={saveSkill} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama skill" htmlFor="skill-name" className="sm:col-span-2">
            <input
              id="skill-name"
              value={skillForm.name}
              onChange={(event) =>
                setSkillForm((current) => ({ ...current, name: event.target.value }))
              }
              maxLength={150}
              required
              autoFocus
              placeholder="Contoh: TypeScript"
              className={fieldControl}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="skill-description" className="sm:col-span-2">
            <textarea
              id="skill-description"
              value={skillForm.description}
              onChange={(event) =>
                setSkillForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={2}
              placeholder="Ruang lingkup skill..."
              className={fieldControl}
            />
          </Field>
          <Field label="Target belajar" htmlFor="skill-target" className="sm:col-span-2">
            <input
              id="skill-target"
              value={skillForm.target}
              onChange={(event) =>
                setSkillForm((current) => ({ ...current, target: event.target.value }))
              }
              maxLength={255}
              placeholder="Contoh: Membangun CRUD React + TypeScript"
              className={fieldControl}
            />
          </Field>
          <Field label="Status" htmlFor="skill-status">
            <select
              id="skill-status"
              value={skillForm.status}
              onChange={(event) =>
                setSkillForm((current) => ({
                  ...current,
                  status: event.target.value as SkillStatus,
                }))
              }
              className={fieldControl}
            >
              {skillStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Progres (%)" htmlFor="skill-progress" hint="Nilai 0–100, disimpan manual.">
            <input
              id="skill-progress"
              type="number"
              min={0}
              max={100}
              value={skillForm.progress}
              onChange={(event) =>
                setSkillForm((current) => ({
                  ...current,
                  progress: Number(event.target.value),
                }))
              }
              className={fieldControl}
            />
          </Field>
          <Field label="Proyek terkait" htmlFor="skill-project" className="sm:col-span-2">
            <select
              id="skill-project"
              value={skillForm.project_id ?? ''}
              onChange={(event) =>
                setSkillForm((current) => ({
                  ...current,
                  project_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className={fieldControl}
            >
              <option value="">Tanpa proyek</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catatan utama" htmlFor="skill-notes" className="sm:col-span-2">
            <textarea
              id="skill-notes"
              value={skillForm.notes}
              onChange={(event) =>
                setSkillForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder="Ringkasan catatan belajar..."
              className={fieldControl}
            />
          </Field>
          {skillFormError ? (
            <p role="alert" className="sm:col-span-2 text-[11px] font-semibold text-coral">
              {skillFormError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={resourceModal !== null}
        title={resourceModal === 'edit' ? 'Edit materi' : 'Tambah materi'}
        description="Materi disimpan di tabel learning_resources."
        onClose={() => {
          if (!resourceBusy) setResourceModal(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResourceModal(null)} disabled={resourceBusy}>
              Batal
            </Button>
            <Button type="submit" form="resource-form" disabled={resourceBusy} aria-busy={resourceBusy}>
              {resourceBusy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {resourceBusy ? 'Menyimpan...' : 'Simpan materi'}
            </Button>
          </>
        }
      >
        <form id="resource-form" onSubmit={saveResource} className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul materi" htmlFor="resource-title" className="sm:col-span-2">
            <input
              id="resource-title"
              value={resourceForm.title}
              onChange={(event) =>
                setResourceForm((current) => ({ ...current, title: event.target.value }))
              }
              maxLength={255}
              required
              autoFocus
              placeholder="Contoh: TypeScript Handbook"
              className={fieldControl}
            />
          </Field>
          <Field label="URL sumber" htmlFor="resource-url" className="sm:col-span-2">
            <input
              id="resource-url"
              value={resourceForm.url}
              onChange={(event) =>
                setResourceForm((current) => ({ ...current, url: event.target.value }))
              }
              maxLength={500}
              placeholder="https://..."
              className={fieldControl}
            />
          </Field>
          <Field label="Tipe" htmlFor="resource-type">
            <select
              id="resource-type"
              value={resourceForm.type}
              onChange={(event) =>
                setResourceForm((current) => ({
                  ...current,
                  type: event.target.value as ResourceType,
                }))
              }
              className={fieldControl}
            >
              {resourceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="resource-status">
            <select
              id="resource-status"
              value={resourceForm.status}
              onChange={(event) =>
                setResourceForm((current) => ({
                  ...current,
                  status: event.target.value as ResourceStatus,
                }))
              }
              className={fieldControl}
            >
              {resourceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catatan materi" htmlFor="resource-notes" className="sm:col-span-2">
            <textarea
              id="resource-notes"
              value={resourceForm.notes}
              onChange={(event) =>
                setResourceForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder="Bagian yang dipelajari, PR, atau tautan terkait..."
              className={fieldControl}
            />
          </Field>
          {resourceFormError ? (
            <p role="alert" className="sm:col-span-2 text-[11px] font-semibold text-coral">
              {resourceFormError}
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={noteModal !== null}
        title={noteModal === 'edit' ? 'Edit catatan belajar' : 'Tambah catatan belajar'}
        description="Catatan disimpan di tabel skill_notes."
        onClose={() => {
          if (!noteBusy) setNoteModal(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteModal(null)} disabled={noteBusy}>
              Batal
            </Button>
            <Button type="submit" form="note-form" disabled={noteBusy} aria-busy={noteBusy}>
              {noteBusy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
              {noteBusy ? 'Menyimpan...' : 'Simpan catatan'}
            </Button>
          </>
        }
      >
        <form id="note-form" onSubmit={saveNote}>
          <Field label="Catatan" htmlFor="note-text">
            <textarea
              id="note-text"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={6}
              required
              autoFocus
              placeholder="Tulis insight, pertanyaan, atau hasil latihan..."
              className={fieldControl}
            />
          </Field>
          {noteFormError ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-coral">
              {noteFormError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteSkillTarget !== null}
        title="Arsipkan skill?"
        confirmLabel="Arsipkan skill"
        busy={deleteSkillBusy}
        onClose={() => {
          if (!deleteSkillBusy) setDeleteSkillTarget(null);
        }}
        onConfirm={() => void removeSkill()}
        message={
          <>
            Skill <b>{deleteSkillTarget?.name}</b> akan diarsipkan. Materi dan catatan belajar terkait tetap
            tersimpan di database.
          </>
        }
      />

      <ConfirmDialog
        open={deleteResourceTarget !== null}
        title="Arsipkan materi?"
        confirmLabel="Arsipkan materi"
        busy={deleteResourceBusy}
        onClose={() => {
          if (!deleteResourceBusy) setDeleteResourceTarget(null);
        }}
        onConfirm={() => void removeResource()}
        message={
          <>
            Materi <b>{deleteResourceTarget?.title}</b> akan diarsipkan dari daftar materi skill ini.
          </>
        }
      />

      <ConfirmDialog
        open={deleteNoteTarget !== null}
        title="Arsipkan catatan?"
        confirmLabel="Arsipkan catatan"
        busy={deleteNoteBusy}
        onClose={() => {
          if (!deleteNoteBusy) setDeleteNoteTarget(null);
        }}
        onConfirm={() => void removeNote()}
        message="Catatan belajar ini akan diarsipkan dari daftar."
      />
    </div>
  );
}
