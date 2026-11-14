export const fmtDate = (d, opts) =>
  d ? new Date(d).toLocaleDateString(undefined, opts || { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const units = [
    [60, 'min'],
    [3600, 'hr'],
    [86400, 'day'],
    [604800, 'wk'],
  ];
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  if (s < 604800) return `${Math.round(s / 86400)} day${Math.round(s / 86400) > 1 ? 's' : ''} ago`;
  void units;
  return fmtDate(d);
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

// <input type="date"> wants YYYY-MM-DD
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const isOverdue = (date, status) => !!date && status !== 'done' && status !== 'completed' && new Date(date) < new Date();

export const label = (s = '') => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const cn = (...parts) => parts.filter(Boolean).join(' ');
