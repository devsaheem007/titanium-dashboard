import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, Activity as ActivityIcon } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Skeleton } from '../components/ui';
import { cn, timeAgo } from '../utils/format';

const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, alert: XCircle };
const TONE = { info: 'text-info', success: 'text-ok', warning: 'text-warn', alert: 'text-bad' };

export default function Notifications() {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all'); // all | unread | activity
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [tab]);

  const notes = useFetch(() => (tab === 'activity' ? Promise.resolve(null) : api.get('/notifications', { params: { page, limit: 15, unread: tab === 'unread' ? 'true' : undefined } }).then((r) => r.data)), [tab, page]);
  const acts = useFetch(() => (tab === 'activity' ? api.get('/activities', { params: { page, limit: 20 } }).then((r) => r.data) : Promise.resolve(null)), [tab, page]);

  const open = async (n) => {
    if (!n.read) {
      await api.patch(`/notifications/${n._id}/read`).catch(() => {});
      notes.reload(true);
    }
    if (n.link) navigate(n.link);
  };
  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read');
      notes.reload(true);
    } catch (err) {
      toast.error(getError(err));
    }
  };
  const remove = async (n, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${n._id}`);
      toast.success('Notification deleted');
      notes.reload(true);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const tabBtn = (key, text) => (
    <button key={key} onClick={() => setTab(key)} className={cn('rounded-lg px-3.5 py-1.5 text-sm font-medium transition', tab === key ? 'bg-raised text-ink' : 'text-mute hover:text-ink')}>{text}</button>
  );

  const src = tab === 'activity' ? acts : notes;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Alerts for you, and the workspace activity timeline." actions={tab !== 'activity' && <Button variant="ghost" icon={CheckCheck} onClick={markAll} disabled={!notes.data?.unreadCount}>Mark all as read</Button>} />
      <Card padded={false}>
        <div className="flex items-center gap-1 border-b p-3">
          {tabBtn('all', 'All')}
          {tabBtn('unread', `Unread${notes.data?.unreadCount ? ` (${notes.data.unreadCount})` : ''}`)}
          {tabBtn('activity', 'Activity timeline')}
        </div>

        {src.error && !src.data ? (
          <ErrorState message={getError(src.error)} onRetry={src.reload} />
        ) : src.loading && !src.data ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : tab === 'activity' ? (
          !acts.data || acts.data.data.length === 0 ? <EmptyState icon={ActivityIcon} title="No activity yet" description="Actions across the workspace are recorded here." /> : (
            <ul className="divide-y divide-line/[var(--line-alpha)]">
              {acts.data.data.map((a) => (
                <li key={a._id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar user={a.actor} size={34} />
                  <div className="min-w-0 flex-1"><p className="text-sm">{a.message}</p><p className="text-xs text-mute">{timeAgo(a.createdAt)}</p></div>
                </li>
              ))}
            </ul>
          )
        ) : !notes.data || notes.data.data.length === 0 ? (
          <EmptyState icon={Bell} title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="You'll be notified when you're assigned work, added to projects or messaged." />
        ) : (
          <ul className="divide-y divide-line/[var(--line-alpha)]">
            {notes.data.data.map((n) => {
              const Icon = ICON[n.type] || Info;
              return (
                <li key={n._id}>
                  <div role="button" tabIndex={0} onClick={() => open(n)} onKeyDown={(e) => e.key === 'Enter' && open(n)} className={cn('flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-raised/40', !n.read && 'bg-raised/25')}>
                    <Icon size={18} className={cn('mt-0.5 shrink-0', TONE[n.type])} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">{n.title}{!n.read && <span className="h-1.5 w-1.5 rounded-full bg-silver" />}</p>
                      {n.message && <p className="text-sm text-mute">{n.message}</p>}
                      <p className="mt-1 text-xs text-mute/80">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button className="icon-btn hover:!text-bad" onClick={(e) => remove(n, e)} aria-label="Delete notification"><Trash2 size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={src.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
