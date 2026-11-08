import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

export const fieldLabel =
  'block text-[10px] font-bold uppercase tracking-[0.1em] text-muted';
export const fieldControl =
  'mt-1 w-full rounded-[10px] border border-line bg-soft px-3 py-2 text-[12px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`} htmlFor={htmlFor}>
      <span className={fieldLabel}>{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[10px] font-semibold text-coral">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[10px] leading-relaxed text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-sm shadow-brand/30 hover:bg-brandDeep disabled:bg-brand/50',
  secondary:
    'bg-soft text-brand hover:bg-brandSoft disabled:text-muted',
  danger:
    'bg-coralSoft text-[#b84a2b] hover:bg-[#f6c8b8] dark:text-orange-200 dark:hover:bg-[#4a2c24]',
  ghost:
    'bg-transparent text-muted hover:bg-soft hover:text-ink',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[10.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-2 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-[22px] border border-line bg-panel p-4 shadow-panelLift focus:outline-none sm:p-5 ${
          wide ? 'sm:max-w-[760px]' : 'sm:max-w-[520px]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-bold tracking-[-0.02em] text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-soft text-muted transition-colors hover:bg-brandSoft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <div className="mt-4">{children}</div>

        {footer ? (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
            {busy ? 'Memproses...' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="rounded-[14px] bg-soft2 p-3.5 text-[11.5px] leading-relaxed text-muted">
        {message}
      </div>
    </Modal>
  );
}
