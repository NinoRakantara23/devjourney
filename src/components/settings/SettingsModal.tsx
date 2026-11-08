import type { ReactNode } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  Flag,
  Moon,
  RotateCcw,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { Button, Modal, fieldControl } from '../form';
import {
  NOTIFICATION_DAYS_OPTIONS,
  useNotificationPreferences,
  useTheme,
} from '../../settings';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-line bg-card p-3.5">
      <div>
        <h3 className="text-[12.5px] font-bold text-ink">{title}</h3>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-soft2 p-3">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-brandSoft text-brand">
        <Icon size={15} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-bold text-ink">{label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
          checked ? 'bg-brand' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences, resetPreferences } = useNotificationPreferences();

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Pengaturan"
      description="Preferensi tampilan dan notifikasi disimpan di perangkat ini. Tidak memerlukan akun."
      footer={
        <>
          <Button variant="secondary" onClick={resetPreferences}>
            <RotateCcw size={13} aria-hidden /> Reset notifikasi
          </Button>
          <Button onClick={onClose}>Tutup</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Section
          title="Tampilan"
          description="Pilih tema yang paling nyaman untuk sesi belajar Anda."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                theme === 'light'
                  ? 'border-brand bg-brandSoft'
                  : 'border-line bg-soft2 hover:bg-soft'
              }`}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-[11px] ${
                  theme === 'light' ? 'bg-brand text-white' : 'bg-soft text-muted'
                }`}
              >
                <Sun size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-ink">Terang</span>
                <span className="mt-0.5 block text-[10px] text-muted">Latar terang</span>
              </span>
              {theme === 'light' ? <Check size={16} className="flex-none text-brand" aria-hidden /> : null}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                theme === 'dark'
                  ? 'border-brand bg-brandSoft'
                  : 'border-line bg-soft2 hover:bg-soft'
              }`}
            >
              <span
                className={`grid h-9 w-9 flex-none place-items-center rounded-[11px] ${
                  theme === 'dark' ? 'bg-brand text-white' : 'bg-soft text-muted'
                }`}
              >
                <Moon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-ink">Gelap</span>
                <span className="mt-0.5 block text-[10px] text-muted">Latar gelap</span>
              </span>
              {theme === 'dark' ? <Check size={16} className="flex-none text-brand" aria-hidden /> : null}
            </button>
          </div>
        </Section>

        <Section
          title="Preferensi notifikasi"
          description="Tentukan pengingat yang relevan. Preferensi ini akan dibaca oleh pusat notifikasi DevJourney."
        >
          <div className="space-y-2">
            <ToggleRow
              icon={AlertCircle}
              label="Tugas terlambat"
              description="Tugas yang melewati target date."
              checked={preferences.overdueTasks}
              onChange={(value) => updatePreferences({ overdueTasks: value })}
            />
            <ToggleRow
              icon={Ban}
              label="Tugas terhambat"
              description="Tugas yang berstatus blocked."
              checked={preferences.blockedTasks}
              onChange={(value) => updatePreferences({ blockedTasks: value })}
            />
            <ToggleRow
              icon={Flag}
              label="Milestone mendatang"
              description="Milestone yang mendekati target date."
              checked={preferences.upcomingMilestones}
              onChange={(value) => updatePreferences({ upcomingMilestones: value })}
            />

            <div className="rounded-[14px] border border-line bg-soft2 p-3">
              <label htmlFor="notification-days" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                Jendela pengingat milestone
              </label>
              <select
                id="notification-days"
                value={preferences.upcomingDays}
                onChange={(event) => updatePreferences({ upcomingDays: Number(event.target.value) })}
                disabled={!preferences.upcomingMilestones}
                className={`${fieldControl} max-w-[180px]`}
              >
                {NOTIFICATION_DAYS_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} hari ke depan
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                {preferences.upcomingMilestones
                  ? 'Milestone dalam rentang ini akan dipertimbangkan untuk pengingat.'
                  : 'Aktifkan “Milestone mendatang” untuk mengatur jendela pengingat.'}
              </p>
            </div>
          </div>
        </Section>

        <div className="rounded-[14px] border border-line bg-soft2 p-3">
          <p className="text-[11px] font-bold text-ink">Penyimpanan lokal</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            Preferensi disimpan di browser ini melalui localStorage. Autentikasi dan profil
            multi-user belum tersedia, jadi pengaturan berlaku untuk perangkat ini.
          </p>
          <p role="status" className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#0e6b7b] dark:text-cyan-200">
            <Check size={12} aria-hidden /> Perubahan tersimpan otomatis.
          </p>
        </div>
      </div>
    </Modal>
  );
}
