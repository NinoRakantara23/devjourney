import { useCallback, useEffect, useRef, useState } from 'react';

export type Profile = {
  displayName: string;
  bio: string;
  avatar: string | null;
};

export type ProfilePatch = Partial<Pick<Profile, 'displayName' | 'bio' | 'avatar'>>;

export type ProfileErrors = {
  displayName?: string;
  bio?: string;
};

export const PROFILE_KEY = 'dj-profile';
export const PROFILE_EVENT = 'dj-profile-change';
export const PROFILE_NAME_MAX = 60;
export const PROFILE_BIO_MAX = 160;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const defaultProfile: Profile = {
  displayName: 'DevJourney',
  bio: '',
  avatar: null,
};

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validAvatar(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1_500_000) {
    return null;
  }

  const validDataUrl =
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

  return validDataUrl.test(value) ? value : null;
}

export function normalizeProfile(value: unknown): Profile {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<Profile>) : {};
  return {
    displayName: cleanText(candidate.displayName, PROFILE_NAME_MAX) || defaultProfile.displayName,
    bio: cleanText(candidate.bio, PROFILE_BIO_MAX),
    avatar: validAvatar(candidate.avatar),
  };
}

export function readProfile(): Profile {
  if (typeof window === 'undefined') return defaultProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile;
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile;
  }
}

export function writeProfile(profile: Profile): void {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(
    new CustomEvent<Profile>(PROFILE_EVENT, { detail: profile }),
  );
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  const single = words[0] ?? defaultProfile.displayName;
  const capitals = single.match(/[A-Z]/g);
  if (capitals && capitals.length >= 2) {
    return `${capitals[0]}${capitals[1]}`.toUpperCase();
  }
  return single.slice(0, 2).toUpperCase();
}

export function validateProfileInput(displayName: string, bio: string): ProfileErrors {
  const errors: ProfileErrors = {};
  const cleanName = displayName.trim();
  const cleanBio = bio.trim();

  if (!cleanName) {
    errors.displayName = 'Nama tampilan wajib diisi.';
  } else if (cleanName.length > PROFILE_NAME_MAX) {
    errors.displayName = `Nama tampilan maksimal ${PROFILE_NAME_MAX} karakter.`;
  }

  if (cleanBio.length > PROFILE_BIO_MAX) {
    errors.bio = `Deskripsi maksimal ${PROFILE_BIO_MAX} karakter.`;
  }

  return errors;
}

export async function processAvatarFile(file: File): Promise<string> {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Format avatar harus PNG, JPG, atau WebP.');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Ukuran avatar maksimal 2 MB.');
  }
  if (file.size === 0) {
    throw new Error('File avatar kosong.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      next.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('Gambar avatar tidak valid.');
    }

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak mendukung pemrosesan gambar.');

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );

    const dataUrl = canvas.toDataURL('image/webp', 0.86);
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Gagal memproses avatar.');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(readProfile);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      const next = normalizeProfile(detail ?? readProfile());
      profileRef.current = next;
      setProfile(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PROFILE_KEY) return;
      const next = readProfile();
      profileRef.current = next;
      setProfile(next);
    };
    window.addEventListener(PROFILE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PROFILE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updateProfile = useCallback((patch: ProfilePatch) => {
    const next = normalizeProfile({ ...profileRef.current, ...patch });
    writeProfile(next);
    profileRef.current = next;
    setProfile(next);
    return next;
  }, []);

  return { profile, updateProfile };
}
