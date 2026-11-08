import { ArrowLeft, Construction, Sparkles } from 'lucide-react';
import { Card, EmptyState } from '../components/ui';
import type { NavItem } from '../navigation';

export default function PlaceholderPage({ item }: { item: NavItem }) {
  const { Icon } = item;

  return (
    <div className="max-w-[840px]">
      <section className="relative overflow-hidden rounded-[24px] border border-line bg-card p-5 shadow-cardLift sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-[18px] bg-brandSoft text-brand">
            <Icon size={24} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted">DevJourney</p>
            <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              {item.label}
            </h1>
            <p className="mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-muted">
              {item.description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sunSoft px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8a6410] dark:text-amber-200">
            <Construction size={12} aria-hidden /> Halaman placeholder
          </span>
          <span className="rounded-full bg-soft px-2.5 py-1 text-[10px] font-medium text-muted">
            Route: {item.href.replace('#', '')}
          </span>
        </div>

        <EmptyState icon={Icon} title="Konten belum tersedia" className="mt-5">
          Navigasi sudah berfungsi, tetapi fitur {item.label} belum dibuat. Halaman ini tidak
          menampilkan data atau progres palsu.
        </EmptyState>

        <a
          href="#/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-[12px] bg-brand px-4 py-2.5 text-[11.5px] font-bold text-white shadow-[0_10px_24px_rgba(124,65,245,.28)] transition-colors hover:bg-brandDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <ArrowLeft size={15} aria-hidden /> Kembali ke Dashboard
        </a>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Sparkles size={14} className="text-brand" aria-hidden /> Status
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            Menu ini sudah terhubung ke route dan indikator sidebar. Isi halaman akan ditambahkan
            pada tahap berikutnya tanpa mengubah backend.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink">
            <Icon size={14} className="text-brand" aria-hidden /> Akses
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            Gunakan sidebar desktop, navigasi bawah pada tablet/mobile, atau URL langsung. Tombol
            Back dan Forward browser tetap bekerja.
          </p>
        </Card>
      </div>
    </div>
  );
}
