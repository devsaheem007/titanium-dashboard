import { useState } from 'react';
import { Download, Users, FolderKanban, CheckSquare, Activity } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorState, PageHeader, Skeleton } from '../components/ui';

const REPORTS = [
  { type: 'users', title: 'Users', icon: Users, description: 'Name, email, role, status, last login and join date.', count: 'users', permission: 'users:read' },
  { type: 'projects', title: 'Projects', icon: FolderKanban, description: 'Status, progress, deadline, owner and assignees.', count: 'projects' },
  { type: 'tasks', title: 'Tasks', icon: CheckSquare, description: 'Status, priority, project, assignee and due dates.', count: 'tasks' },
  { type: 'activity', title: 'Activity log', icon: Activity, description: 'The latest 5,000 recorded actions across the workspace.', count: 'activity' },
];

export default function Reports() {
  const toast = useToast();
  const { can } = useAuth();
  const [busy, setBusy] = useState('');
  const summary = useFetch(() => api.get('/reports/summary').then((r) => r.data.counts), []);

  const download = async (type) => {
    setBusy(type);
    try {
      const res = await api.get(`/reports/export/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `titanium-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${type[0].toUpperCase() + type.slice(1)} report downloaded`);
    } catch (err) {
      // blob responses hide the JSON error body, so give a generic message when needed
      toast.error(err.response?.data instanceof Blob ? 'Could not generate the report' : getError(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Export your data as CSV files that open in Excel or Google Sheets." />
      {summary.error && !summary.data ? (
        <Card><ErrorState message={getError(summary.error)} onRetry={summary.reload} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {REPORTS.filter((r) => !r.permission || can(r.permission)).map((r) => (
            <Card key={r.type}>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-silver"><r.icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-sm text-mute">{r.description}</p>
                  <p className="mt-2 text-xs text-mute">{summary.loading && !summary.data ? <Skeleton className="h-4 w-24" /> : `${summary.data?.[r.count] ?? 0} records`}</p>
                </div>
              </div>
              <Button variant="ghost" icon={Download} loading={busy === r.type} onClick={() => download(r.type)} className="mt-5 w-full">Download CSV</Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
