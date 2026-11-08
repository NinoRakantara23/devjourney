import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { AlertCircle, Check, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { Button, Field, Modal, fieldControl } from '../form';
import {
  AVATAR_ACCEPT,
  PROFILE_BIO_MAX,
  PROFILE_NAME_MAX,
  processAvatarFile,
  useProfile,
  validateProfileInput,
  type ProfileErrors,
} from '../../profile';
import ProfileAvatar from './ProfileAvatar';

type Notice = { type: 'success' | 'error'; message: string } | null;

function saveErrorMessage(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return 'Penyimpanan browser penuh. Hapus foto atau gunakan data yang lebih kecil.';
  }
  return error instanceof Error ? error.message : 'Gagal menyimpan profil.';
}

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profile, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [avatarError, setAvatarError] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
      setAvatar(profile.avatar);
      setErrors({});
      setAvatarError('');
      setAvatarBusy(false);
      setSaving(false);
      setNotice(null);
    }
    wasOpen.current = open;
  }, [open, profile]);

  const close = () => {
    if (saving || avatarBusy) return;
    onClose();
  };

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setAvatarError('');
    setNotice(null);
    setAvatarBusy(true);
    try {
      const next = await processAvatarFile(file);
      setAvatar(next);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Gagal memproses avatar.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = () => {
    setAvatar(null);
    setAvatarError('');
    setNotice(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || avatarBusy) return;

    const cleanName = displayName.trim();
    const cleanBio = bio.trim();
    const nextErrors = validateProfileInput(cleanName, cleanBio);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNotice({ type: 'error', message: 'Periksa kembali data profil.' });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      updateProfile({ displayName: cleanName, bio: cleanBio, avatar });
      setDisplayName(cleanName);
      setBio(cleanBio);
      setNotice({ type: 'success', message: 'Profil tersimpan.' });
    } catch (error) {
      setNotice({ type: 'error', message: saveErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Profil"
      description="Informasi profil dan avatar disimpan di browser ini. Tidak memerlukan akun."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving || avatarBusy}>
            Batal
          </Button>
          <Button type="submit" form="profile-form" disabled={saving || avatarBusy}>
            {saving ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <Save size={13} aria-hidden />
            )}
            {saving ? 'Menyimpan...' : 'Simpan profil'}
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} noValidate>
        <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-line bg-card p-3 text-center">
            <div className="mx-auto w-fit">
              <ProfileAvatar
                name={displayName || profile.displayName}
                avatar={avatar}
                className="h-20 w-20 text-[24px]"
              />
            </div>

            <input
              id="profile-avatar"
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={onAvatarChange}
              disabled={avatarBusy || saving}
              className="peer sr-only"
            />
            <label
              htmlFor="profile-avatar"
              className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-soft px-3 py-2 text-[10.5px] font-bold text-brand transition-colors hover:bg-brandSoft peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
                avatarBusy || saving
                  ? 'pointer-events-none cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              }`}
            >
              {avatarBusy ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <Upload size={13} aria-hidden />
              )}
              {avatarBusy ? 'Memproses...' : avatar ? 'Ganti foto' : 'Unggah foto'}
            </label>

            {avatar ? (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={avatarBusy || saving}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[10px] font-semibold text-muted transition-colors hover:bg-soft hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={12} aria-hidden /> Hapus foto
              </button>
            ) : null}

            <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
              PNG, JPG, WebP · maks 2 MB. Foto dipotong persegi dan diperkecil otomatis.
            </p>
            {avatarError ? (
              <p role="alert" className="mt-1.5 text-[9.5px] font-semibold leading-relaxed text-coral">
                {avatarError}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <Field
              label="Nama tampilan"
              htmlFor="profile-name"
              error={errors.displayName}
              hint={`${displayName.length}/${PROFILE_NAME_MAX} karakter`}
            >
              <input
                id="profile-name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  if (errors.displayName) {
                    setErrors((previous) => ({ ...previous, displayName: undefined }));
                  }
                  if (notice) setNotice(null);
                }}
                maxLength={PROFILE_NAME_MAX}
                autoComplete="nickname"
                aria-invalid={Boolean(errors.displayName)}
                className={fieldControl}
              />
            </Field>

            <Field
              label="Deskripsi singkat"
              htmlFor="profile-bio"
              error={errors.bio}
              hint={`${bio.length}/${PROFILE_BIO_MAX} karakter`}
            >
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value);
                  if (errors.bio) {
                    setErrors((previous) => ({ ...previous, bio: undefined }));
                  }
                  if (notice) setNotice(null);
                }}
                rows={4}
                maxLength={PROFILE_BIO_MAX}
                aria-invalid={Boolean(errors.bio)}
                className={`${fieldControl} resize-none`}
              />
            </Field>

            <div className="rounded-[14px] border border-line bg-soft2 p-3">
              <p className="text-[11px] font-bold text-ink">Penyimpanan lokal</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                Profil ini tersimpan di browser dan perangkat ini. Tidak ada login, registrasi,
                multi-user, atau sinkronisasi server pada fase ini.
              </p>
            </div>
          </div>
        </div>

        {notice ? (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 flex items-start gap-2 rounded-[12px] border px-3 py-2 text-[10.5px] font-semibold leading-relaxed ${
              notice.type === 'error'
                ? 'border-coral/30 bg-coralSoft text-[#b84a2b] dark:text-orange-200'
                : 'border-[#b7e4d4] bg-[#e8f8f2] text-[#0e6b7b] dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertCircle size={14} className="mt-0.5 flex-none" aria-hidden />
            ) : (
              <Check size={14} className="mt-0.5 flex-none" aria-hidden />
            )}
            {notice.message}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
