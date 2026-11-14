import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, Input, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getError, getFieldErrors } from '../api/client';

export function validatePassword(p) {
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(p)) return 'Password must contain a letter';
  if (!/\d/.test(p)) return 'Password must contain a number';
  return '';
}

export default function Register() {
  const { register, settings } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!settings.allowRegistration) return <Navigate to="/login" replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = 'Enter a valid email address';
    const pw = validatePassword(form.password);
    if (pw) er.password = pw;
    if (form.confirm !== form.password) er.confirm = 'Passwords do not match';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;

    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast.success('Account created. Welcome aboard!');
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && (
          <div className="rounded-xl border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm text-bad" role="alert">
            {formError}
          </div>
        )}
        <Input label="Full name" autoComplete="name" icon={User} value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" autoComplete="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput label="Password" autoComplete="new-password" icon={Lock} hint="At least 8 characters, with a letter and a number." value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput label="Confirm password" autoComplete="new-password" icon={Lock} value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
