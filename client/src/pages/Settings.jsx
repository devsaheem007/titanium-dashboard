import { useEffect, useState } from 'react';
import { Moon, Sun, Save } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ErrorState, Input, PageHeader, Skeleton, Toggle } from '../components/ui';
import { cn, label } from '../utils/format';

function Appearance() {
  const { user, setTheme } = useAuth();
  const opt = (value, Icon, text) => (
    <button onClick={() => setTheme(value)} aria-pressed={user.theme === value} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition', user.theme === value ? 'border-silver/60 bg-silver/10' : 'text-mute hover:text-ink')}>
      <Icon size={16} /> {text}
    </button>
  );
  return (
    <Card title="Appearance">
      <p className="mb-3 text-sm text-mute">Choose how Titanium looks. Your choice is saved to your account.</p>
      <div className="flex max-w-sm gap-3">{opt('dark', Moon, 'Dark')}{opt('light', Sun, 'Light')}</div>
    </Card>
  );
}

function NotificationPrefs() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const prefs = user.notificationPrefs;
  const [saving, setSaving] = useState('');

  const update = async (key, value) => {
    const previous = user;
    setUser({ ...user, notificationPrefs: { ...prefs, [key]: value } }); // optimistic
    setSaving(key);
    try {
      const { data } = await api.patch('/profile', { notificationPrefs: { [key]: value } });
      setUser(data.user);
      toast.success('Preference saved');
    } catch (err) {
      setUser(previous);
      toast.error(getError(err));
    } finally {
      setSaving('');
    }
  };

  return (
    <Card title="Notification preferences">
      <div className="divide-y divide-line/[var(--line-alpha)]">
        <Toggle label="In-app notifications" description="Show notifications in the bell and notifications page." checked={prefs.inApp} disabled={saving === 'inApp'} onChange={(v) => update('inApp', v)} />
        <Toggle label="Email notifications" description="Also email me. Only works when the server has SMTP configured." checked={prefs.email} disabled={saving === 'email'} onChange={(v) => update('email', v)} />
        <Toggle label="Task assignments" description="When a task is assigned to me." checked={prefs.taskAssignments} disabled={saving === 'taskAssignments'} onChange={(v) => update('taskAssignments', v)} />
        <Toggle label="Project updates" description="When I'm added to a project." checked={prefs.projectUpdates} disabled={saving === 'projectUpdates'} onChange={(v) => update('projectUpdates', v)} />
      </div>
    </Card>
  );
}

function AppSettings() {
  const { settings, setSettings } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const save = async (e) => {
    e.preventDefault();
    if (form.appName.trim().length < 2) return setErrors({ appName: 'App name must be at least 2 characters' });
    setSaving(true);
    try {
      const { data } = await api.patch('/admin/settings', { appName: form.appName.trim(), allowRegistration: form.allowRegistration, systemAlert: form.systemAlert.trim() });
      setSettings(data.settings);
      setErrors({});
      toast.success('Application settings saved');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Application settings" action={<Badge tone="silver">Admin</Badge>}>
      <form onSubmit={save} className="space-y-4" noValidate>
        <Input label="Application name" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} error={errors.appName} />
        <Input label="System alert banner" value={form.systemAlert} onChange={(e) => setForm({ ...form, systemAlert: e.target.value })} hint="Shown to every signed-in user at the top of the app. Leave empty to hide it." error={errors.systemAlert} maxLength={300} />
        <Toggle label="Allow public registration" description="When off, only admins can create accounts and the register page is closed." checked={form.allowRegistration} onChange={(v) => setForm({ ...form, allowRegistration: v })} />
        <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>Save settings</Button>
      </form>
    </Card>
  );
}

function RolesMatrix() {
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/roles').then((r) => r.data), []);
  return (
    <Card title="Roles and permissions" action={<Badge tone="silver">Admin</Badge>} padded={false}>
      {error && !data ? <ErrorState message={getError(error)} onRetry={reload} /> : loading && !data ? <div className="p-5"><Skeleton className="h-40" /></div> : (
        <>
          <p className="px-5 pt-4 text-sm text-mute">What each role can do by default. To give one person extra permissions, edit them in <span className="text-ink">Users Management</span>.</p>
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[480px]">
              <thead><tr><th className="th">Permission</th>{data.roles.map((r) => <th key={r.role} className="th text-center">{label(r.role)}</th>)}</tr></thead>
              <tbody className="divide-y divide-line/[var(--line-alpha)]">
                {data.permissions.map((p) => (
                  <tr key={p.key}>
                    <td className="td"><span className="font-medium">{p.key}</span><span className="block text-xs text-mute">{p.description}</span></td>
                    {data.roles.map((r) => <td key={r.role} className="td text-center">{r.permissions.includes(p.key) ? <span className="text-ok" aria-label="Allowed">✓</span> : <span className="text-mute/50" aria-label="Not allowed">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export default function Settings() {
  const { can } = useAuth();
  return (
    <>
      <PageHeader title="Settings" subtitle="Personalise your experience." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4"><Appearance /><NotificationPrefs /></div>
        {can('settings:manage') && <div className="space-y-4"><AppSettings /><RolesMatrix /></div>}
      </div>
    </>
  );
}
