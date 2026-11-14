import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { timeAgo, cn } from '../utils/format';
import { Spinner } from './ui';

const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, alert: XCircle };
const TONE = { info: 'text-info', success: 'text-ok', warning: 'text-warn', alert: 'text-bad' };

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async (showSpinner) => {
    if (showSpinner) setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 8 } });
      setItems(data.data);
      setUnread(data.unreadCount);
    } catch {
      /* the bell just keeps its previous state */
    } finally {
      setLoading(false);
    }
  };

  // Poll every 30s so new notifications show up without a page refresh.
  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load(false);
  };

  const markRead = async (n) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(u - 1, 0));
      api.patch(`/notifications/${n._id}/read`).catch(() => {});
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn relative" onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-silver px-1 text-[10px] font-bold text-on-silver">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="glass absolute right-0 z-40 mt-2 w-[min(92vw,380px)] animate-fade-up overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAll} disabled={!unread} className="flex items-center gap-1 text-xs text-mute hover:text-ink disabled:opacity-40">
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8 text-mute">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-mute">You're all caught up.</p>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type] || Info;
                return (
                  <button key={n._id} onClick={() => markRead(n)} className={cn('flex w-full gap-3 border-b px-4 py-3 text-left transition last:border-0 hover:bg-raised/60', !n.read && 'bg-raised/30')}>
                    <Icon size={16} className={cn('mt-0.5 shrink-0', TONE[n.type])} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-silver" />}
                      </span>
                      {n.message && <span className="block truncate text-xs text-mute">{n.message}</span>}
                      <span className="mt-0.5 block text-[11px] text-mute/80">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-mute hover:text-ink">
            <Check size={14} /> View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
