import { forwardRef, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Loader2, X, Inbox, AlertCircle, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn, initials } from '../utils/format';

export const Spinner = ({ size = 18, className }) => <Loader2 size={size} className={cn('animate-spin', className)} />;

export function PageLoader({ text = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-mute">
      <Spinner size={26} />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function Button({ variant = 'primary', loading, children, className, icon: Icon, ...props }) {
  const cls = { primary: 'btn-primary', ghost: 'btn-ghost', danger: 'btn-danger' }[variant];
  return (
    <button className={cn(cls, className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner size={16} /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

export const Field = ({ label, error, hint, children, className }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    {children}
    {error ? (
      <p className="mt-1.5 flex items-center gap-1 text-xs text-bad" role="alert">
        <AlertCircle size={12} /> {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-mute">{hint}</p>
    ) : null}
  </div>
);

export const Input = forwardRef(function Input({ label, error, hint, className, icon: Icon, ...props }, ref) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        {Icon && <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />}
        <input id={id} ref={ref} className={cn('field', Icon && 'pl-10')} aria-invalid={!!error} {...props} />
      </div>
    </Field>
  );
});

export const PasswordInput = forwardRef(function PasswordInput({ label, error, hint, className, icon: Icon, ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        {Icon && <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />}
        <input ref={ref} type={show ? 'text' : 'password'} className={cn('field pr-11', Icon && 'pl-10')} aria-invalid={!!error} {...props} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-mute hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
});

export const Textarea = ({ label, error, hint, className, ...props }) => (
  <Field label={label} error={error} hint={hint} className={className}>
    <textarea className="field min-h-[96px] resize-y" aria-invalid={!!error} {...props} />
  </Field>
);

export const Select = ({ label, error, hint, className, children, compact, ...props }) => (
  <Field label={label} error={error} hint={hint} className={className}>
    <select className={cn('field appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', compact && 'py-2')} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238b9098' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} aria-invalid={!!error} {...props}>
      {children}
    </select>
  </Field>
);

export const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label className={cn('flex cursor-pointer items-center justify-between gap-4 py-2', disabled && 'cursor-not-allowed opacity-50')}>
    <span>
      <span className="block text-sm font-medium">{label}</span>
      {description && <span className="block text-xs text-mute">{description}</span>}
    </span>
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-silver' : 'bg-raised')}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-base shadow transition-all', checked ? 'left-[22px] bg-on-silver' : 'left-0.5 bg-mute')} />
    </button>
  </label>
);

export const Card = ({ title, action, children, className, padded = true }) => (
  <section className={cn('glass animate-fade-up', className)}>
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
    )}
    <div className={padded ? 'p-5' : ''}>{children}</div>
  </section>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const TONES = {
  neutral: 'bg-raised text-mute',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad',
  info: 'bg-info/15 text-info',
  silver: 'bg-silver/15 text-silver',
};
export const Badge = ({ tone = 'neutral', children, className }) => (
  <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>
);

export const Avatar = ({ user, size = 36 }) => (
  <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-xs font-semibold text-silver ring-1 ring-line/10" style={{ width: size, height: size, fontSize: size * 0.36 }}>
    {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initials(user?.name)}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-raised text-mute">
      <Icon size={22} />
    </div>
    <h3 className="text-sm font-semibold">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-mute">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <AlertTriangle className="text-bad" size={24} />
    <p className="max-w-sm text-sm text-mute">{message}</p>
    {onRetry && (
      <Button variant="ghost" onClick={() => onRetry()}>
        Try again
      </Button>
    )}
  </div>
);

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-raised', className)} />;

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('glass relative flex max-h-[92vh] w-full animate-fade-up flex-col rounded-b-none sm:rounded-b-2xl', width)}>
        <header className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmText = 'Delete', loading, onConfirm, onClose, tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-mute">{message}</p>
    </Modal>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-mute">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-1">
        <button className="icon-btn disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <button className="icon-btn disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="relative min-w-[200px] flex-1">
    <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input className="field pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  </div>
);

export const STATUS_TONE = {
  planning: 'neutral',
  active: 'info',
  on_hold: 'warn',
  completed: 'ok',
  todo: 'neutral',
  in_progress: 'info',
  review: 'warn',
  done: 'ok',
  low: 'neutral',
  medium: 'info',
  high: 'warn',
  urgent: 'bad',
  admin: 'silver',
  manager: 'info',
  user: 'neutral',
};
