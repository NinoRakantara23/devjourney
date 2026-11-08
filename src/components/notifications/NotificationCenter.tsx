import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Bell,
  Check,
  CheckCheck,
  Flag,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../form';
import type {
  NotificationKind,
  NotificationSeverity,
  UseNotificationsResult,
} from '../../notifications';

const buttonClass =
  'relative grid h-10 w-10 place-items-center rounded-[12px] text-ink transition-colors hover:bg-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel';

const kindMeta: Record<
  NotificationKind,
  { icon: LucideIcon; className: string }
> = {
  'task-overdue': {
    icon: AlertCircle,
    className: 'bg-coralSoft text-[#b84a2b] dark:text-orange-200',
  },
  'task-blocked': {
    icon: Ban,
    className: 'bg-sunSoft text-[#8a6410] dark:text-amber-200',
  },
  'milestone-upcoming': {
    icon: Flag,
    className: 'bg-aquaSoft text-[#0e6b7b] dark:text-cyan-200',
  },
};

const severityLabel: Record<NotificationSeverity, string> = {
  danger: 'Perlu perhatian',
  warning: 'Terhambat',
  info: 'Mendatang',
};

export default function NotificationCenter({
  notifications,
}: {
  notifications: UseNotificationsResult;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const {
    items,
    loading,
    error,
    unreadCount,
    preferences,
    refresh,
    markRead,
    markAllRead,
  } = notifications;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void refresh();
  };

  const allDisabled =
    !preferences.overdueTasks &&
    !preferences.blockedTasks &&
    !preferences.upcomingMilestones;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={
          unreadCount > 0
            ? `Notifikasi, ${unreadCount} belum dibaca`
            : 'Notifikasi'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifikasi"
        className={`${buttonClass} ${open ? 'bg-soft text-brand' : ''}`}
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-[17px] min-w-[17px] place-items-center rounded-full bg-coral px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pusat notifikasi"
          tabIndex={-1}
          className="fixed inset-x-3 top-[7.25rem] z-50 overflow-hidden rounded-[20px] border border-line bg-panel shadow-panelLift focus:outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(360px,calc(100vw-2rem))]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Notifikasi</p>
              <p className="mt-0.5 text-[10px] text-muted">
                {loading
                  ? 'Memperbarui...'
                  : unreadCount > 0
                    ? `${unreadCount} belum dibaca`
                    : 'Semua sudah dibaca'}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex flex-none items-center gap-1 rounded-[9px] bg-soft px-2 py-1.5 text-[9.5px] font-bold text-brand transition-colors hover:bg-brandSoft disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <CheckCheck size={12} aria-hidden /> Tandai semua
            </button>
          </div>

          <div className="max-h-[min(60vh,460px)] overflow-y-auto p-2 sm:max-h-[min(70vh,460px)]">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-[11px] text-muted">
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Memuat notifikasi...
              </div>
            ) : error && items.length === 0 ? (
              <div className="px-4 py-7 text-center">
                <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-coralSoft text-[#b84a2b] dark:text-orange-200">
                  <AlertCircle size={16} aria-hidden />
                </span>
                <p className="text-[12px] font-semibold text-ink">Gagal memuat notifikasi</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{error}</p>
                <Button variant="secondary" className="mt-3" onClick={() => void refresh()}>
                  Coba lagi
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-soft text-muted">
                  <Bell size={16} aria-hidden />
                </span>
                <p className="text-[12px] font-semibold text-ink">Tidak ada notifikasi</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  {allDisabled
                    ? 'Semua kategori notifikasi dimatikan di Pengaturan.'
                    : 'Tidak ada tugas terlambat, tugas terhambat, atau milestone mendatang saat ini.'}
                </p>
              </div>
            ) : (
              <>
                {error ? (
                  <div className="mb-2 rounded-[12px] border border-coral/30 bg-coralSoft px-3 py-2 text-[10px] text-[#b84a2b] dark:text-orange-200">
                    {error}{' '}
                    <button
                      type="button"
                      onClick={() => void refresh()}
                      className="font-bold underline underline-offset-2"
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : null}
                <ul className="space-y-1">
                  {items.map((item) => {
                    const meta = kindMeta[item.kind];
                    const Icon = meta.icon;
                    return (
                      <li
                        key={item.id}
                        data-notification-id={item.id}
                        data-read={item.read ? 'true' : 'false'}
                      >
                        <div
                          className={`flex items-start rounded-[14px] transition-colors ${
                            item.read
                              ? 'bg-transparent hover:bg-soft2'
                              : 'bg-brandSoft hover:bg-soft'
                          }`}
                        >
                          <a
                            href={item.href}
                            onClick={() => {
                              markRead(item.id);
                              setOpen(false);
                            }}
                            className="flex min-w-0 flex-1 gap-2.5 rounded-[14px] p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <span
                              className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] ${meta.className}`}
                            >
                              <Icon size={15} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-[11.5px] font-bold text-ink">
                                  {item.title}
                                </span>
                                {!item.read ? (
                                  <span
                                    className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-brand"
                                    aria-label="Belum dibaca"
                                  />
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted">
                                {item.message}
                              </span>
                              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                                {severityLabel[item.severity]}
                              </span>
                            </span>
                          </a>
                          {!item.read ? (
                            <button
                              type="button"
                              onClick={() => markRead(item.id)}
                              aria-label={`Tandai ${item.title} sudah dibaca`}
                              title="Tandai sudah dibaca"
                              className="mr-2 mt-2 grid h-6 w-6 flex-none place-items-center rounded-[8px] text-muted transition-colors hover:bg-panel hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <Check size={13} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="border-t border-line px-4 py-2 text-[9.5px] leading-relaxed text-muted">
            Berdasarkan tugas dan milestone nyata di database DevJourney.
          </div>
        </div>
      ) : null}
    </div>
  );
}
