import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Calendar, FolderKanban, SearchX, ListChecks } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useFetch, useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, SearchInput, Select, Skeleton, Textarea, STATUS_TONE } from '../components/ui';
import { fmtDate, isOverdue, label, toDateInput, cn } from '../utils/format';
import { PROJECT_STATUSES } from '../utils/constants';

export function useDirectory() {
  return useFetch(() => api.get('/users/directory').then((r) => r.data.data), []);
}

export function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-silver transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

const blank = { name: '', description: '', status: 'planning', deadline: '', progress: 0, assignedTo: [] };

function ProjectForm({ open, project, onClose, onSaved }) {
  const toast = useToast();
  const directory = useDirectory();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const editing = !!project;
  const hasTasks = (project?.taskStats?.total || 0) > 0;

  useEffect(() => {
    if (open) {
      setForm(project ? { name: project.name, description: project.description || '', status: project.status, deadline: toDateInput(project.deadline), progress: project.progress, assignedTo: project.assignedTo.map((u) => u._id) } : blank);
      setErrors({});
    }
  }, [open, project]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const toggleUser = (id) => set('assignedTo', form.assignedTo.includes(id) ? form.assignedTo.filter((x) => x !== id) : [...form.assignedTo, id]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: 'Project name must be at least 2 characters' });
    const payload = { name: form.name.trim(), description: form.description.trim(), status: form.status, deadline: form.deadline || null, assignedTo: form.assignedTo };
    if (!hasTasks) payload.progress = Number(form.progress) || 0;
    setSaving(true);
    try {
      if (editing) await api.patch(`/projects/${project._id}`, payload);
      else await api.post('/projects', payload);
      toast.success(editing ? 'Project updated' : 'Project created');
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
    <Modal open={open} onClose={onClose} title={editing ? 'Edit project' : 'New project'} footer={<><Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="project-form" loading={saving}>{editing ? 'Save changes' : 'Create project'}</Button></>}>
      <form id="project-form" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </Select>
          <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} error={errors.deadline} />
        </div>
        <Input label={`Progress: ${hasTasks ? project.progress : form.progress}%`} type="range" min="0" max="100" step="5" disabled={hasTasks} value={hasTasks ? project.progress : form.progress} onChange={(e) => set('progress', e.target.value)} hint={hasTasks ? 'Calculated automatically from completed tasks.' : 'Set manually until the project has tasks, then it follows task completion.'} />
        <div>
          <span className="label">Assign to</span>
          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl border p-2">
            {directory.loading ? <p className="p-2 text-sm text-mute">Loading users…</p> : directory.data?.map((u) => (
              <label key={u._id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-raised/60">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--silver))]" checked={form.assignedTo.includes(u._id)} onChange={() => toggleUser(u._id)} />
                <Avatar user={u} size={24} />
                <span className="text-sm">{u.name}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ProjectDetail({ id, onClose }) {
  const { data, loading, error } = useFetch(() => (id ? api.get(`/projects/${id}`).then((r) => r.data) : Promise.resolve(null)), [id]);
  return (
    <Modal open={!!id} onClose={onClose} title={data?.project?.name || 'Project'} size="lg">
      {loading && !data ? <Skeleton className="h-40" /> : error ? <ErrorState message={getError(error)} /> : data && (
        <div className="space-y-5">
          {data.project.description && <p className="text-sm text-mute">{data.project.description}</p>}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone={STATUS_TONE[data.project.status]}>{label(data.project.status)}</Badge>
            <Badge><Calendar size={12} /> {data.project.deadline ? fmtDate(data.project.deadline) : 'No deadline'}</Badge>
            <Badge>Owner: {data.project.owner?.name}</Badge>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-mute"><span>Progress</span><span>{data.project.progress}%</span></div>
            <ProgressBar value={data.project.progress} />
          </div>
          <div>
            <span className="label">Team</span>
            {data.project.assignedTo.length === 0 ? <p className="text-sm text-mute">Nobody assigned yet.</p> : (
              <div className="flex flex-wrap gap-3">{data.project.assignedTo.map((u) => <span key={u._id} className="flex items-center gap-2 text-sm"><Avatar user={u} size={24} />{u.name}</span>)}</div>
            )}
          </div>
          <div>
            <span className="label">Tasks ({data.tasks.length})</span>
            {data.tasks.length === 0 ? <p className="text-sm text-mute">No tasks in this project yet.</p> : (
              <ul className="divide-y divide-line/[var(--line-alpha)] rounded-xl border">
                {data.tasks.map((t) => (
                  <li key={t._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="truncate">{t.title}</span>
                    <span className="flex shrink-0 gap-2"><Badge tone={STATUS_TONE[t.priority]}>{label(t.priority)}</Badge><Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Projects() {
  const { can } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, project: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const canWrite = can('projects:write');

  useEffect(() => setPage(1), [search, status]);
  useEffect(() => {
    if (params.get('new') === '1' && canWrite) {
      setForm({ open: true, project: null });
      setParams({}, { replace: true });
    }
  }, [params, canWrite, setParams]);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/projects', { params: { page, limit: 9, search: search || undefined, status: status || undefined } }).then((r) => r.data),
    [page, search, status]
  );

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/projects/${toDelete._id}`);
      toast.success(`"${toDelete.name}" and its tasks were deleted`);
      setToDelete(null);
      if (data.data.length === 1 && page > 1) setPage(page - 1);
      else reload(true);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const filtered = !!(search || status);

  return (
    <>
      <PageHeader title="Projects" subtitle="Plan, assign and track progress." actions={canWrite && <Button icon={Plus} onClick={() => setForm({ open: true, project: null })}>New project</Button>} />

      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search projects…" />
        <div className="w-44">
          <Select compact value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </Select>
        </div>
      </div>

      {error && !data ? (
        <Card><ErrorState message={getError(error)} onRetry={reload} /></Card>
      ) : loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : data.data.length === 0 ? (
        <Card><EmptyState icon={filtered ? SearchX : FolderKanban} title={filtered ? 'No projects match your filters' : 'No projects yet'} description={filtered ? 'Try a different search or status.' : canWrite ? 'Create your first project to start tracking work.' : 'Projects you are assigned to will appear here.'} action={!filtered && canWrite && <Button icon={Plus} onClick={() => setForm({ open: true, project: null })}>New project</Button>} /></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.data.map((p) => {
              const late = isOverdue(p.deadline, p.status);
              return (
                <article key={p._id} className="glass flex animate-fade-up flex-col p-5 transition hover:border-line/25">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setViewId(p._id)} className="min-w-0 text-left">
                      <h3 className="truncate font-semibold hover:underline">{p.name}</h3>
                    </button>
                    <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-mute">{p.description || 'No description.'}</p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-mute"><span>{p.taskStats.done}/{p.taskStats.total} tasks</span><span>{p.progress}%</span></div>
                    <ProgressBar value={p.progress} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {p.assignedTo.slice(0, 4).map((u) => <span key={u._id} title={u.name} className="rounded-full ring-2 ring-panel"><Avatar user={u} size={28} /></span>)}
                      {p.assignedTo.length > 4 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-raised text-[10px] ring-2 ring-panel">+{p.assignedTo.length - 4}</span>}
                      {p.assignedTo.length === 0 && <span className="text-xs text-mute">Unassigned</span>}
                    </div>
                    <span className={cn('flex items-center gap-1 text-xs', late ? 'text-bad' : 'text-mute')}><Calendar size={13} />{p.deadline ? fmtDate(p.deadline) : 'No deadline'}</span>
                  </div>
                  <div className="mt-4 flex gap-1 border-t pt-3">
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs" icon={ListChecks} onClick={() => setViewId(p._id)}>Details</Button>
                    {canWrite && (
                      <>
                        <button className="icon-btn ml-auto" onClick={() => setForm({ open: true, project: p })} aria-label={`Edit ${p.name}`}><Pencil size={16} /></button>
                        <button className="icon-btn hover:!text-bad" onClick={() => setToDelete(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="glass mt-4 overflow-hidden"><Pagination pagination={data.pagination} onPage={setPage} /></div>
        </>
      )}

      <ProjectForm open={form.open} project={form.project} onClose={() => setForm({ open: false, project: null })} onSaved={() => reload(true)} />
      <ProjectDetail id={viewId} onClose={() => setViewId(null)} />
      <ConfirmDialog open={!!toDelete} title="Delete project?" message={toDelete ? `"${toDelete.name}" and all of its ${toDelete.taskStats.total} task(s) will be permanently deleted.` : ''} loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
