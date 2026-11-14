import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, PasswordInput } from '../components/ui';
import { api, getError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { validatePassword } from './Register';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    const pw = validatePassword(form.password);
    if (pw) er.password = pw;
    if (form.confirm !== form.password) er.confirm = 'Passwords do not match';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something strong that you don't use elsewhere."
      footer={
        <Link to="/forgot-password" className="font-medium text-ink hover:underline">
          Request a new link
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-xl border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm text-bad" role="alert">
            {formError}
          </div>
        )}
        <PasswordInput label="New password" autoComplete="new-password" icon={Lock} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="At least 8 characters, with a letter and a number." />
        <PasswordInput label="Confirm new password" autoComplete="new-password" icon={Lock} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
