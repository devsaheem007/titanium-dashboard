import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, ShieldCheck, KeyRound, Clock } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, PageHeader, PasswordInput } from '../components/ui';
import { fmtDateTime, cn } from '../utils/format';
import { validatePassword } from './Register';

function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return s; // 0-4
}

export default function Security() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.currentPassword) er.currentPassword = 'Current password is required';
    const pw = validatePassword(form.newPassword);
    if (pw) er.newPassword = pw;
    else if (form.newPassword === form.currentPassword) er.newPassword = 'New password must be different from the current one';
    if (form.confirm !== form.newPassword) er.confirm = 'Passwords do not match';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Other devices were signed out.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const s = strength(form.newPassword);
  const bars = ['bg-bad', 'bg-bad', 'bg-warn', 'bg-ok', 'bg-ok'];

  return (
    <>
      <PageHeader title="Security" subtitle="Protect your account." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Change password" className="lg:col-span-2">
          <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
            <PasswordInput label="Current password" autoComplete="current-password" icon={Lock} value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
            <div>
              <PasswordInput label="New password" autoComplete="new-password" icon={KeyRound} value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="At least 8 characters, with a letter and a number." />
              {form.newPassword && (
                <div className="mt-2 flex gap-1" aria-label={`Password strength ${s} of 4`}>
                  {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full', i < s ? bars[s] : 'bg-raised')} />)}
                </div>
              )}
            </div>
            <PasswordInput label="Confirm new password" autoComplete="new-password" icon={KeyRound} value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
            <Button type="submit" loading={saving}>Update password</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="This session">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><ShieldCheck size={16} className="text-ok" /> Signed in as <span className="truncate font-medium">{user.email}</span></li>
              <li className="flex items-center gap-3"><Clock size={16} className="text-mute" /> Last sign-in {fmtDateTime(user.lastLoginAt)}</li>
            </ul>
            <p className="mt-4 text-xs text-mute">Your session lives in a secure HTTP-only cookie that scripts cannot read. It lasts up to 7 days.</p>
            <Button variant="ghost" icon={LogOut} className="mt-4 w-full" onClick={async () => { await logout(); toast.success('You have been signed out'); navigate('/login'); }}>Sign out of this device</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
