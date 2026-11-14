import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Button, Input } from '../components/ui';
import { api, getError } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? 'Check your inbox' : 'Forgot your password?'}
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-medium text-ink hover:underline">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck size={32} className="text-ok" />
          <p className="text-sm text-mute">If an account exists for <span className="text-ink">{email}</span>, a reset link is on its way. It expires in 30 minutes.</p>
          <Button variant="ghost" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input label="Email" type="email" autoComplete="email" icon={Mail} value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} error={error} />
          <Button type="submit" loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
