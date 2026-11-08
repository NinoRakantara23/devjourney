import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { addTask } from '../../api';
import type { Project } from '../../types';

export default function QuickAdd({
  projects,
  preview,
  onDone,
}: {
  projects: Project[];
  preview: boolean;
  onDone: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [pid, setPid] = useState<number>(projects[0]?.id ?? 0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    if (projects.length === 0) {
      setPid(0);
      return;
    }
    if (!projects.some((project) => project.id === pid)) {
      setPid(projects[0].id);
    }
  }, [pid, projects]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || submittingRef.current) return;

    const clean = title.trim();
    setNotice('');
    setSuccess('');

    if (preview) {
      setNotice('API tidak tersedia: hubungkan backend dan pastikan proyek nyata tersedia untuk menyimpan tugas.');
      return;
    }
    if (!clean) {
      setNotice('Judul tugas wajib diisi.');
      return;
    }
    if (clean.length > 255) {
      setNotice('Judul tugas maksimal 255 karakter.');
      return;
    }
    if (!pid || !projects.some((project) => project.id === pid)) {
      setNotice('Pilih proyek yang valid terlebih dahulu.');
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      const created = await addTask(pid, clean);
      setTitle('');
      setSuccess(`Tugas #${created.id} ditambahkan.`);
      await onDone();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Gagal menambah tugas.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      noValidate
      className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card px-3 py-2.5 shadow-cardLift"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        <Plus size={13} aria-hidden /> Quick add
      </span>

      <label className="sr-only" htmlFor="new-task-title">
        Judul tugas baru
      </label>
      <input
        id="new-task-title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (notice) setNotice('');
          if (success) setSuccess('');
        }}
        placeholder="Tambah tugas baru..."
        maxLength={255}
        required
        disabled={busy}
        autoComplete="off"
        className="min-w-[150px] flex-1 rounded-xl bg-soft px-3 py-2 text-[12px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/20"
      />

      <label className="sr-only" htmlFor="new-task-project">
        Proyek
      </label>
      <select
        id="new-task-project"
        value={pid}
        onChange={(e) => {
          setPid(Number(e.target.value));
          if (notice) setNotice('');
          if (success) setSuccess('');
        }}
        disabled={busy || projects.length === 0}
        className="max-w-[210px] rounded-xl bg-soft px-2.5 py-2 text-[11.5px] text-ink outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {projects.length === 0 ? <option value={0}>Belum ada proyek</option> : null}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={busy || !pid || projects.length === 0}
        className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-[11.5px] font-bold text-white shadow-sm shadow-brand/30 transition-colors hover:bg-brandDeep disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={14} aria-hidden /> {busy ? 'Menyimpan...' : 'Tambah'}
      </button>

      <div aria-live="polite" className="w-full space-y-1">
        {notice ? (
          <p role="status" className="text-[10.5px] font-medium leading-relaxed text-coral">
            {notice}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-[10.5px] font-medium leading-relaxed text-[#0e6b7b] dark:text-cyan-200">
            {success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
