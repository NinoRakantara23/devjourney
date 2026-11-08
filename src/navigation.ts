import { useSyncExternalStore } from 'react';
import {
  BookOpen,
  FolderKanban,
  History,
  LayoutDashboard,
  ListChecks,
  Map,
  Target,
  type LucideIcon,
} from 'lucide-react';

export type RouteId =
  | 'dashboard'
  | 'roadmap'
  | 'proyek'
  | 'tasks'
  | 'perjalanan'
  | 'milestone'
  | 'skill-learning';

export type NavItem = {
  id: RouteId;
  label: string;
  href: string;
  Icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '#/dashboard',
    Icon: LayoutDashboard,
    description: 'Ringkasan aktivitas belajar, proyek, tugas, dan progres mingguan.',
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    href: '#/roadmap',
    Icon: Map,
    description: 'Rencana perjalanan belajar dan target jangka panjang.',
  },
  {
    id: 'proyek',
    label: 'Proyek',
    href: '#/proyek',
    Icon: FolderKanban,
    description: 'Daftar proyek dan ringkasan progresnya.',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '#/tasks',
    Icon: ListChecks,
    description: 'Semua tugas yang sedang dikerjakan, tertunda, atau selesai.',
  },
  {
    id: 'perjalanan',
    label: 'Perjalanan',
    href: '#/perjalanan',
    Icon: History,
    description: 'Riwayat belajar dan catatan perkembangan dari waktu ke waktu.',
  },
  {
    id: 'milestone',
    label: 'Milestone',
    href: '#/milestone',
    Icon: Target,
    description: 'Target, pencapaian, dan tonggak penting dalam perjalanan belajar.',
  },
];

export const skillItem: NavItem = {
  id: 'skill-learning',
  label: 'Skill & Learning',
  href: '#/skill-learning',
  Icon: BookOpen,
  description: 'Area belajar dan pengembangan skill berkelanjutan.',
};

export const allNavItems: NavItem[] = [...navItems, skillItem];

export const routeById = Object.fromEntries(
  allNavItems.map((item) => [item.id, item]),
) as Record<RouteId, NavItem>;

const routeIds = new Set<RouteId>(allNavItems.map((item) => item.id));

export function getRouteFromHash(hash: string): RouteId {
  const raw = hash.replace(/^#\/?/, '').split(/[/?#]/)[0].trim().toLowerCase();
  if (!raw) return 'dashboard';
  return routeIds.has(raw as RouteId) ? (raw as RouteId) : 'dashboard';
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange);
  window.addEventListener('popstate', onStoreChange);
  return () => {
    window.removeEventListener('hashchange', onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

const getSnapshot = () => getRouteFromHash(window.location.hash);
const getServerSnapshot = () => 'dashboard' as RouteId;
const getHashSnapshot = () => window.location.hash;
const getHashServerSnapshot = () => '';

export function useHashRoute() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Re-renders when the hash (including its query string) changes. */
export function useHash() {
  return useSyncExternalStore(subscribe, getHashSnapshot, getHashServerSnapshot);
}

export function getHashParams(hash: string) {
  const queryIndex = hash.indexOf('?');
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '');
}
