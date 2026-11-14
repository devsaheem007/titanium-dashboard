import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckSquare, SearchX, Calendar } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useFetch, useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, SearchInput, Select, Skeleton, Textarea, STATUS_TONE } from '../components/ui';
import { useDirectory } from './Projects';
import { fmtDate, isOverdue, label, toDateInput, cn } from '../utils/format';
import { TASK_PRIORITIES, TASK_STATUSES } from '../utils/constants';

const blank = { title: '', description: '', status: 'todo', priority: 'medium', project: '', assignee: '', dueDate: '' };

function TaskForm({ open, task, onClose, onSaved, canAssign }) {
  const toast = useToast();
  const directory = useDirectory();
  const projects = useFetch(() => api.get('/projects', { params: { limit: 100 } }).then((r) => r.data.data), []);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const editing = !!task;

  useEffect(() => {
    if (open) {
      setForm(task ? { title: task.title, description: task.description || '', status: task.status, priority: task.priority, project: task.project?._id || '', assignee: task.assignee?._id || '', dueDate: toDateInput(task.dueDate) } : blank);
      setErrors({});
    }
  }, [open, task]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2) return setErrors({ title: 'Title must be at least 2 characters' });
    const payload = { title: form.title.trim(), description: form.description.trim(), status: form.status, priority: form.priority, project: form.project || null, assignee: form.assignee || null, dueDate: form.dueDate || null };
    setSaving(true);
    try {
      if (editing) await api.patch(`/tasks/${task._id}`, payload);
      else await api.post('/tasks', payload);
      toast.success(editing ? 'Task updated' : 'Task created');
      onSaved();
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'New task'} footer={<><Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="task-form" loading={saving}>{editing ? 'Save changes' : 'Create task'}</Button></>}>
      <form id="task-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Title" value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </Select>
          <Select label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {TASK_PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </Select>
          <Select label="Project" value={form.project} onChange={(e) => set('project', e.target.value)} error={errors.project}>
            <option value="">No project</option>
            {projects.data?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <Select label="Assignee" value={form.assignee} onChange={(e) => set('assignee', e.target.value)} error={errors.assignee}>
            <option value="">Unassigned</option>
            {directory.data?.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>
        </div>
        <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} error={errors.dueDate} />
        {!canAssign && editing && <p className="text-xs text-mute">You can only change the status of tasks assigned to you.</p>}
      </form>
    </Modal>
  );
}

export default function Tasks() {
  const { user, can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [f, setF] = useState({ status: '', priority: '', project: '', assignee: '', mine: false, overdue: false });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, task: null });
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const canManage = can('tasks:write');
  const directory = useDirectory();
  const projects = useFetch(() => api.get('/projects', { params: { limit: 100 } }).then((r) => r.data.data), []);

  useEffect(() => setPage(1), [search, f]);
  useEffect(() => {
    if (params.get('new') === '1') {
      setForm({ open: true, task: null });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/tasks', { params: { page, limit: 10, search: search || undefined, status: f.status || undefined, priority: f.priority || undefined, project: f.project || undefined, assignee: f.assignee || undefined, mine: f.mine ? 'true' : undefined, overdue: f.overdue ? 'true' : undefined } }).then((r) => r.data),
    [page, search, f]
  );

  const setStatus = async (t, status) => {
    try {
      await api.patch(`/tasks/${t._id}`, { status });
      toast.success(`Task moved to ${label(status).toLowerCase()}`);
      reload(true);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/tasks/${toDelete._id}`);
      toast.success('Task deleted');
      setToDelete(null);
      if (data.data.length === 1 && page > 1) setPage(page - 1);
      else reload(true);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const filtered = !!(search || f.status || f.priority || f.project || f.assignee || f.mine || f.overdue);
  const clear = () => { setQ(''); setF({ status: '', priority: '', project: '', assignee: '', mine: false, overdue: false }); };
  const chip = (key, text) => (
    <button onClick={() => setF((x) => ({ ...x, [key]: !x[key] }))} className={cn('rounded-full border px-3.5 py-2 text-sm transition', f[key] ? 'border-silver/60 bg-silver/15 text-ink' : 'text-mute hover:text-ink')} aria-pressed={f[key]}>{text}</button>
  );

  return (
    <>
      <PageHeader title="Tasks" subtitle="Create, assign and keep work moving." actions={<Button icon={Plus} onClick={() => setForm({ open: true, task: null })}>New task</Button>} />

      <Card padded={false}>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search tasks…" />
            <div className="w-36"><Select compact value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">All statuses</option>{TASK_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></div>
            <div className="w-36"><Select compact value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} aria-label="Priority"><option value="">All priorities</option>{TASK_PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select></div>
            <div className="w-40"><Select compact value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })} aria-label="Project"><option value="">All projects</option>{projects.data?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</Select></div>
            <div className="w-40"><Select compact value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} aria-label="Assignee"><option value="">All assignees</option>{directory.data?.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</Select></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chip('mine', 'Assigned to me')}
            {chip('overdue', 'Overdue')}
            {filtered && <button onClick={clear} className="text-sm text-mute underline-offset-2 hover:text-ink hover:underline">Clear filters</button>}
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={getError(error)} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={filtered ? SearchX : CheckSquare} title={filtered ? 'No tasks match your filters' : 'No tasks yet'} description={filtered ? 'Try changing or clearing the filters.' : 'Create a task to get started.'} action={filtered ? <Button variant="ghost" onClick={clear}>Clear filters</Button> : <Button icon={Plus} onClick={() => setForm({ open: true, task: null })}>New task</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b"><tr><th className="th">Task</th><th className="th">Project</th><th className="th">Assignee</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Due</th><th className="th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-line/[var(--line-alpha)]">
                {data.data.map((t) => {
                  const late = isOverdue(t.dueDate, t.status);
                  const mine = t.assignee?._id === user._id;
                  const canMove = canManage || mine;
                  return (
                    <tr key={t._id} className="transition hover:bg-raised/40">
                      <td className="td max-w-[260px]"><p className={cn('truncate font-medium', t.status === 'done' && 'text-mute line-through')}>{t.title}</p>{t.description && <p className="truncate text-xs text-mute">{t.description}</p>}</td>
                      <td className="td text-mute">{t.project?.name || '—'}</td>
                      <td className="td">{t.assignee ? <span className="flex items-center gap-2"><Avatar user={t.assignee} size={24} /><span className="text-sm">{t.assignee.name}</span></span> : <span className="text-mute">Unassigned</span>}</td>
                      <td className="td"><Badge tone={STATUS_TONE[t.priority]}>{label(t.priority)}</Badge></td>
                      <td className="td">
                        {canMove ? (
                          <select value={t.status} onChange={(e) => setStatus(t, e.target.value)} className="rounded-lg border bg-raised/60 px-2 py-1 text-xs" aria-label={`Status of ${t.title}`}>
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                          </select>
                        ) : <Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge>}
                      </td>
                      <td className={cn('td whitespace-nowrap', late ? 'text-bad' : 'text-mute')}><span className="inline-flex items-center gap-1"><Calendar size={13} />{t.dueDate ? fmtDate(t.dueDate) : '—'}</span>{late && <span className="ml-1 text-xs">overdue</span>}</td>
                      <td className="td">
                        <div className="flex justify-end gap-0.5">
                          {canManage && <button className="icon-btn" onClick={() => setForm({ open: true, task: t })} aria-label={`Edit ${t.title}`}><Pencil size={16} /></button>}
                          {canManage && <button className="icon-btn hover:!text-bad" onClick={() => setToDelete(t)} aria-label={`Delete ${t.title}`}><Trash2 size={16} /></button>}
                          {!canManage && !mine && <span className="px-2 text-xs text-mute">View only</span>}
                          {!canManage && mine && <span className="px-2 text-xs text-mute">Update status</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>

      <TaskForm open={form.open} task={form.task} canAssign={canManage} onClose={() => setForm({ open: false, task: null })} onSaved={() => reload(true)} />
      <ConfirmDialog open={!!toDelete} title="Delete task?" message={toDelete ? `"${toDelete.title}" will be permanently deleted.` : ''} loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
