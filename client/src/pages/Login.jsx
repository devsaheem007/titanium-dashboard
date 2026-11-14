import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, Input, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getError } from '../api/client';

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export default function Login() {
  const { login, settings } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!EMAIL_RX.test(form.email.trim())) er.email = 'Enter a valid email address';
    if (!form.password) er.password = 'Password is required';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;

    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footer={
        settings.allowRegistration ? (
          <>
            New here?{' '}
            <Link to="/register" className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          'Registration is currently closed.'
        )
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-xl border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm text-bad" role="alert">
            {formError}
          </div>
        )}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput label="Password" autoComplete="current-password" placeholder="Your password" icon={Lock} value={form.password} onChange={set('password')} error={errors.password} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-mute hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
