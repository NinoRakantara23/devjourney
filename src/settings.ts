import { useCallback, useEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'dj-theme';
export const THEME_EVENT = 'dj-theme-change';
export const NOTIFICATION_PREFS_KEY = 'dj-notification-prefs';
export const NOTIFICATION_PREFS_EVENT = 'dj-notification-prefs-change';

export type NotificationPreferences = {
  overdueTasks: boolean;
  blockedTasks: boolean;
  upcomingMilestones: boolean;
  upcomingDays: number;
};

export const NOTIFICATION_DAYS_OPTIONS = [3, 7, 14, 30] as const;

export const defaultNotificationPreferences: NotificationPreferences = {
  overdueTasks: true,
  blockedTasks: true,
  upcomingMilestones: true,
  upcomingDays: 7,
};

export function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      /* localStorage tidak tersedia */
    }
  }
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* tetap terapkan tema untuk sesi ini */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Theme>).detail;
      setThemeState(detail === 'light' || detail === 'dark' ? detail : getStoredTheme());
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<NotificationPreferences>) : {};
  const days = Number(candidate.upcomingDays);
  return {
    overdueTasks:
      typeof candidate.overdueTasks === 'boolean'
        ? candidate.overdueTasks
        : defaultNotificationPreferences.overdueTasks,
    blockedTasks:
      typeof candidate.blockedTasks === 'boolean'
        ? candidate.blockedTasks
        : defaultNotificationPreferences.blockedTasks,
    upcomingMilestones:
      typeof candidate.upcomingMilestones === 'boolean'
        ? candidate.upcomingMilestones
        : defaultNotificationPreferences.upcomingMilestones,
    upcomingDays: (NOTIFICATION_DAYS_OPTIONS as readonly number[]).includes(days)
      ? days
      : defaultNotificationPreferences.upcomingDays,
  };
}

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultNotificationPreferences;
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return defaultNotificationPreferences;
    return normalizeNotificationPreferences(JSON.parse(raw));
  } catch {
    return defaultNotificationPreferences;
  }
}

export function writeNotificationPreferences(preferences: NotificationPreferences) {
  try {
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(preferences));
  } catch {
    /* preferensi tetap berlaku untuk sesi ini */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<NotificationPreferences>(NOTIFICATION_PREFS_EVENT, {
        detail: preferences,
      }),
    );
  }
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(readNotificationPreferences);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      const next = normalizeNotificationPreferences(detail ?? readNotificationPreferences());
      preferencesRef.current = next;
      setPreferences(next);
    };
    window.addEventListener(NOTIFICATION_PREFS_EVENT, onChange);
    return () => window.removeEventListener(NOTIFICATION_PREFS_EVENT, onChange);
  }, []);

  const updatePreferences = useCallback((patch: Partial<NotificationPreferences>) => {
    const next = normalizeNotificationPreferences({
      ...preferencesRef.current,
      ...patch,
    });
    preferencesRef.current = next;
    setPreferences(next);
    writeNotificationPreferences(next);
  }, []);

  const resetPreferences = useCallback(() => {
    const next = { ...defaultNotificationPreferences };
    preferencesRef.current = next;
    setPreferences(next);
    writeNotificationPreferences(next);
  }, []);

  return { preferences, updatePreferences, resetPreferences };
}
