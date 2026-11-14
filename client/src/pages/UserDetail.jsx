import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Power, Trash2, Mail, Calendar, Clock, FolderKanban, ListTodo, CheckCircle2 } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageLoader, STATUS_TONE } from '../components/ui';
import { UserFormModal } from './Users';
import { fmtDate, fmtDateTime, label, timeAgo } from '../utils/format';

export default function UserDetail() {
  const { id } = useParams();
  const { user: me, can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => api.get(`/users/${id}`).then((r) => r.data), [id]);
  const canWrite = can('users:write');

  if (loading && !data) return <PageLoader />;
  if (error && !data) {
    const notFound = error.response?.status === 404;
    return <Card><ErrorState message={notFound ? 'This user does not exist.' : getError(error)} onRetry={notFound ? undefined : reload} /></Card>;
  }
  const u = data.user;
  const isSelf = u._id === me._id;

  const toggle = async () => {
    try {
      await api.patch(`/users/${u._id}/status`, { isActive: !u.isActive });
      toast.success(`Account ${u.isActive ? 'deactivated' : 'activated'}`);
      reload(true);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${u._id}`);
      toast.success('User deleted');
      navigate('/users', { replace: true });
    } catch (err) {
      toast.error(getError(err));
      setBusy(false);
    }
  };

  const Stat = ({ icon: Icon, value, text }) => (
    <div className="rounded-xl bg-raised/50 p-4">
      <Icon size={16} className="text-mute" />
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-mute">{text}</p>
    </div>
  );

  return (
    <>
      <Link to="/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"><ArrowLeft size={15} /> All users</Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar user={u} size={84} />
            <h1 className="mt-4 text-xl font-semibold">{u.name}</h1>
            <div className="mt-2 flex gap-2">
              <Badge tone={STATUS_TONE[u.role]}>{label(u.role)}</Badge>
              <Badge tone={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3"><Mail size={16} className="text-mute" /><dd className="truncate">{u.email}</dd></div>
            <div className="flex items-center gap-3"><Calendar size={16} className="text-mute" /><dd>Joined {fmtDate(u.createdAt)}</dd></div>
            <div className="flex items-center gap-3"><Clock size={16} className="text-mute" /><dd>{u.lastLoginAt ? `Last login ${fmtDateTime(u.lastLoginAt)}` : 'Has never signed in'}</dd></div>
          </dl>
          {canWrite && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="ghost" icon={Pencil} onClick={() => setEdit(true)}>Edit</Button>
              <Button variant="ghost" icon={Power} disabled={isSelf} onClick={toggle}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
              <Button variant="ghost" icon={Trash2} disabled={isSelf} className="hover:!text-bad" onClick={() => setDel(true)}>Delete</Button>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={FolderKanban} value={data.stats.projects} text="Projects" />
            <Stat icon={ListTodo} value={data.stats.openTasks} text="Open tasks" />
            <Stat icon={CheckCircle2} value={data.stats.doneTasks} text="Completed tasks" />
          </div>
          <Card title="Permissions">
            {u.effectivePermissions.length === 0 ? (
              <p className="text-sm text-mute">No special permissions. This user can work on their own projects and tasks.</p>
            ) : (
              <div className="flex flex-wrap gap-2">{u.effectivePermissions.map((p) => <Badge key={p} tone="silver">{p}</Badge>)}</div>
            )}
          </Card>
          <Card title="Recent activity" padded={false}>
            {data.activities.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="divide-y divide-line/[var(--line-alpha)]">
                {data.activities.map((a) => (
                  <li key={a._id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span>{a.message}</span>
                    <span className="shrink-0 text-xs text-mute">{timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <UserFormModal open={edit} user={u} onClose={() => setEdit(false)} onSaved={() => reload(true)} />
      <ConfirmDialog open={del} title="Delete user?" message={`${u.name} will be permanently removed. This cannot be undone.`} loading={busy} onConfirm={remove} onClose={() => setDel(false)} />
    </>
  );
}
