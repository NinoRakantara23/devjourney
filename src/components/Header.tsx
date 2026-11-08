import { useState } from 'react';
import { ChevronDown, Moon, Search, Settings, Sun } from 'lucide-react';
import NotificationCenter from './notifications/NotificationCenter';
import ProfileAvatar from './profile/ProfileAvatar';
import ProfileModal from './profile/ProfileModal';
import SettingsModal from './settings/SettingsModal';
import { useNotifications } from '../notifications';
import { useProfile } from '../profile';
import { useTheme } from '../settings';

const iconBtn =
  'grid h-10 w-10 place-items-center rounded-[12px] text-ink transition-colors hover:bg-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel';

type HeaderProps = {
  query: string;
  onQuery: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
};

export default function Header({
  query,
  onQuery,
  placeholder = 'Search projects, tasks...',
  disabled = false,
  disabledHint = 'Pencarian belum tersedia di halaman ini',
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { profile } = useProfile();
  const notifications = useNotifications();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dark = theme === 'dark';
  const toggle = () => setTheme(dark ? 'light' : 'dark');

  return (
    <header className="mb-5 flex flex-wrap items-center gap-3 lg:mb-6">
      <label
        className={`order-1 flex h-11 w-full items-center gap-2.5 rounded-[14px] bg-soft px-4 text-muted transition focus-within:ring-2 focus-within:ring-brand/20 sm:order-none sm:max-w-[480px] sm:flex-1 ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
        title={disabled ? disabledHint : undefined}
      >
        <Search size={17} aria-hidden />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={disabled ? disabledHint : placeholder}
          autoComplete="off"
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />
      </label>

      <div className="order-2 ml-auto flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={toggle}
          className={iconBtn}
          aria-pressed={dark}
          aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          title={dark ? 'Mode terang' : 'Mode gelap'}
        >
          {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Pengaturan"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          title="Pengaturan"
          className={`${iconBtn} ${settingsOpen ? 'bg-soft text-brand' : ''}`}
        >
          <Settings size={18} aria-hidden />
        </button>

        <NotificationCenter notifications={notifications} />

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label={`Buka profil ${profile.displayName}`}
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          title={`Profil ${profile.displayName}`}
          className={`ml-1 flex items-center gap-2 rounded-full py-0.5 pl-1 pr-1.5 transition-colors hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel ${
            profileOpen ? 'bg-soft text-brand' : ''
          }`}
        >
          <ProfileAvatar name={profile.displayName} avatar={profile.avatar} />
          <span className="hidden max-w-[140px] truncate text-[12.5px] font-bold text-ink sm:inline">
            {profile.displayName}
          </span>
          <ChevronDown
            size={14}
            className={`text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
