import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Power, Eye, Users as UsersIcon, SearchX } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useFetch, useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, PasswordInput, SearchInput, Select, Skeleton, STATUS_TONE } from '../components/ui';
import { fmtDate, timeAgo, label } from '../utils/format';
import { PERMISSIONS, ROLES, ROLE_DEFAULTS } from '../utils/constants';
import { validatePassword } from './Register';

const blank = { name: '', email: '', password: '', role: 'user', isActive: true, permissions: [] };

export function UserFormModal({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!user;
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(user ? { name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive, permissions: user.permissions || [] } : blank);
      setErrors({});
    }
  }, [open, user]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const togglePerm = (p) => set('permissions', form.permissions.includes(p) ? form.permissions.filter((x) => x !== p) : [...form.permissions, p]);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = 'Enter a valid email address';
    if (!editing || form.password) {
      const pw = validatePassword(form.password);
      if (pw) er.password = pw;
    }
    setErrors(er);
    if (Object.keys(er).length) return;

    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive, permissions: form.permissions };
    if (form.password) payload.password = form.password;
    setSaving(true);
    try {
      const { data } = editing ? await api.patch(`/users/${user._id}`, payload) : await api.post('/users', payload);
      toast.success(editing ? 'User updated' : 'User created');
      onSaved(data.user);
      onClose();
    } catch (err) {
      const fe = getFieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) toast.error(getError(err));
      else toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const inherited = ROLE_DEFAULTS[form.role] || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit user' : 'Add new user'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="user-form" loading={saving}>{editing ? 'Save changes' : 'Create user'}</Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>
        <PasswordInput label={editing ? 'New password' : 'Password'} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} error={errors.password} hint={editing ? 'Leave blank to keep the current password.' : 'At least 8 characters, with a letter and a number.'} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </Select>
          <Select label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => set('isActive', e.target.value === 'active')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div>
          <span className="label">Permissions</span>
          <p className="mb-2 text-xs text-mute">Checked-and-locked permissions come from the role. Tick others to grant extras to this user.</p>
          <div className="space-y-1 rounded-xl border p-3">
            {Object.entries(PERMISSIONS).map(([key, desc]) => {
              const fromRole = inherited.includes(key);
              return (
                <label key={key} className="flex items-start gap-3 py-1.5 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--silver))]" checked={fromRole || form.permissions.includes(key)} disabled={fromRole} onChange={() => togglePerm(key)} />
                  <span>
                    <span className="font-medium">{key}</span>
                    <span className="block text-xs text-mute">{desc}{fromRole ? ' · from role' : ''}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me, can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ open: false, user: null });
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const canWrite = can('users:write');

  useEffect(() => setPage(1), [search, role, status]);
  useEffect(() => {
    if (params.get('new') === '1' && canWrite) {
      setModal({ open: true, user: null });
      setParams({}, { replace: true });
    }
  }, [params, canWrite, setParams]);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/users', { params: { page, limit: 10, search: search || undefined, role: role || undefined, status: status || undefined } }).then((r) => r.data),
    [page, search, role, status]
  );

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u._id}/status`, { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`);
      reload(true);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${toDelete._id}`);
      toast.success(`${toDelete.name} was deleted`);
      setToDelete(null);
      if (data.data.length === 1 && page > 1) setPage(page - 1);
      else reload(true);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const filtered = !!(search || role || status);

  return (
    <>
      <PageHeader title="Users Management" subtitle="Manage accounts, roles and permissions." actions={canWrite && <Button icon={Plus} onClick={() => setModal({ open: true, user: null })}>Add user</Button>} />

      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name or email…" />
          <div className="w-36">
            <Select compact value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
            </Select>
          </div>
          <div className="w-36">
            <Select compact value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={getError(error)} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={filtered ? SearchX : UsersIcon} title={filtered ? 'No users match your filters' : 'No users yet'} description={filtered ? 'Try a different search or clear the filters.' : 'Add your first user to get started.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b">
                <tr>
                  <th className="th">User</th>
                  <th className="th">Role</th>
                  <th className="th">Status</th>
                  <th className="th">Last login</th>
                  <th className="th">Joined</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/[var(--line-alpha)]">
                {data.data.map((u) => (
                  <tr key={u._id} className="transition hover:bg-raised/40">
                    <td className="td">
                      <Link to={`/users/${u._id}`} className="flex items-center gap-3">
                        <Avatar user={u} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{u.name}{u._id === me._id && <span className="ml-2 text-xs text-mute">(you)</span>}</span>
                          <span className="block truncate text-xs text-mute">{u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td"><Badge tone={STATUS_TONE[u.role]}>{label(u.role)}</Badge></td>
                    <td className="td"><Badge tone={u.isActive ? 'ok' : 'bad'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="td text-mute">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</td>
                    <td className="td text-mute">{fmtDate(u.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-0.5">
                        <Link to={`/users/${u._id}`} className="icon-btn" aria-label={`View ${u.name}`} title="View details"><Eye size={16} /></Link>
                        {canWrite && (
                          <>
                            <button className="icon-btn" onClick={() => setModal({ open: true, user: u })} aria-label={`Edit ${u.name}`} title="Edit"><Pencil size={16} /></button>
                            <button className="icon-btn disabled:opacity-30" disabled={u._id === me._id} onClick={() => toggleActive(u)} aria-label={u.isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`} title={u.isActive ? 'Deactivate' : 'Activate'}><Power size={16} /></button>
                            <button className="icon-btn hover:!text-bad disabled:opacity-30" disabled={u._id === me._id} onClick={() => setToDelete(u)} aria-label={`Delete ${u.name}`} title="Delete"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>

      <UserFormModal open={modal.open} user={modal.user} onClose={() => setModal({ open: false, user: null })} onSaved={() => reload(true)} />
      <ConfirmDialog open={!!toDelete} title="Delete user?" message={toDelete ? `${toDelete.name} will be permanently removed. Their tasks become unassigned and their notifications are deleted. This cannot be undone.` : ''} loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
