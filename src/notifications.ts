import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMilestones, getTasks } from './api';
import {
  useNotificationPreferences,
  type NotificationPreferences,
} from './settings';
import type { Milestone, Task } from './types';
import { formatDate, todayISO } from './utils';

export type NotificationKind = 'task-overdue' | 'task-blocked' | 'milestone-upcoming';
export type NotificationSeverity = 'danger' | 'warning' | 'info';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
  date: string | null;
  severity: NotificationSeverity;
};

export type NotificationItem = AppNotification & { read: boolean };

export type NotificationReadState = Record<string, string>;

export type UseNotificationsResult = {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  preferences: NotificationPreferences;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const NOTIFICATION_READS_KEY = 'dj-notification-reads';
export const NOTIFICATION_READS_EVENT = 'dj-notification-reads-change';

function localDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

function targetDate(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

export function buildNotifications(
  tasks: Task[],
  milestones: Milestone[],
  preferences: NotificationPreferences,
): AppNotification[] {
  const today = todayISO();
  const upcomingLimit = addDaysISO(today, preferences.upcomingDays);
  const items: AppNotification[] = [];

  if (preferences.overdueTasks) {
    for (const task of tasks) {
      const date = targetDate(task.target_date);
      if (task.status === 'done' || !date || date >= today) continue;
      items.push({
        id: `task-overdue:${task.id}:${date}`,
        kind: 'task-overdue',
        title: 'Tugas terlambat',
        message: `“${task.title}” di ${task.project} melewati target ${formatDate(date)}.`,
        href: '#/tasks',
        date,
        severity: 'danger',
      });
    }
  }

  if (preferences.blockedTasks) {
    for (const task of tasks) {
      if (task.status !== 'blocked') continue;
      const reason = task.blocked_reason ? ` Alasan: ${task.blocked_reason}.` : '';
      items.push({
        id: `task-blocked:${task.id}`,
        kind: 'task-blocked',
        title: 'Tugas terhambat',
        message: `“${task.title}” di ${task.project} sedang terhambat.${reason}`,
        href: '#/tasks',
        date: targetDate(task.target_date),
        severity: 'warning',
      });
    }
  }

  if (preferences.upcomingMilestones) {
    for (const milestone of milestones) {
      const date = targetDate(milestone.target_date);
      if (milestone.status !== 'planned' || !date || date < today || date > upcomingLimit) {
        continue;
      }
      items.push({
        id: `milestone-upcoming:${milestone.id}:${date}`,
        kind: 'milestone-upcoming',
        title: 'Milestone mendatang',
        message: `“${milestone.title}” untuk ${milestone.project} ditargetkan ${formatDate(date)}.`,
        href: '#/milestone',
        date,
        severity: 'info',
      });
    }
  }

  const unique = new Map<string, AppNotification>();
  for (const item of items) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  const rank: Record<NotificationSeverity, number> = { danger: 0, warning: 1, info: 2 };
  return [...unique.values()].sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (a.date ?? '').localeCompare(b.date ?? '') ||
      a.title.localeCompare(b.title),
  );
}

export function normalizeReadState(value: unknown): NotificationReadState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: NotificationReadState = {};
  for (const [key, readAt] of Object.entries(value)) {
    if (typeof key === 'string' && typeof readAt === 'string') result[key] = readAt;
  }
  return result;
}

export function readNotificationReadState(): NotificationReadState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_READS_KEY);
    if (!raw) return {};
    return normalizeReadState(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeNotificationReadState(state: NotificationReadState) {
  try {
    window.localStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(state));
  } catch {
    /* status baca tetap berlaku untuk sesi ini */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<NotificationReadState>(NOTIFICATION_READS_EVENT, { detail: state }),
    );
  }
}

export function useNotifications(): UseNotificationsResult {
  const { preferences } = useNotificationPreferences();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readState, setReadState] = useState<NotificationReadState>(readNotificationReadState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const preferencesRef = useRef(preferences);
  const readStateRef = useRef(readState);
  preferencesRef.current = preferences;
  readStateRef.current = readState;

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const [tasks, milestones] = await Promise.all([
        getTasks(),
        getMilestones({ status: 'planned' }),
      ]);
      if (requestId !== requestIdRef.current) return;
      setItems(buildNotifications(tasks, milestones, preferencesRef.current));
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Tidak dapat memuat notifikasi.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, preferences]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<NotificationReadState>).detail;
      const next = normalizeReadState(detail ?? readNotificationReadState());
      readStateRef.current = next;
      setReadState(next);
    };
    window.addEventListener(NOTIFICATION_READS_EVENT, onChange);
    return () => window.removeEventListener(NOTIFICATION_READS_EVENT, onChange);
  }, []);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const itemsWithRead = useMemo(
    () => items.map((item) => ({ ...item, read: Boolean(readState[item.id]) })),
    [items, readState],
  );
  const unreadCount = useMemo(
    () => itemsWithRead.filter((item) => !item.read).length,
    [itemsWithRead],
  );

  const markRead = useCallback((id: string) => {
    const current = readStateRef.current;
    if (current[id]) return;
    const next = { ...current, [id]: new Date().toISOString() };
    readStateRef.current = next;
    setReadState(next);
    writeNotificationReadState(next);
  }, []);

  const markAllRead = useCallback(() => {
    const current = readStateRef.current;
    const next = { ...current };
    const now = new Date().toISOString();
    let changed = false;
    for (const item of items) {
      if (!next[item.id]) {
        next[item.id] = now;
        changed = true;
      }
    }
    if (!changed) return;
    readStateRef.current = next;
    setReadState(next);
    writeNotificationReadState(next);
  }, [items]);

  return {
    items: itemsWithRead,
    loading,
    error,
    unreadCount,
    preferences,
    refresh: load,
    markRead,
    markAllRead,
  };
}
