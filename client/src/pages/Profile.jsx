import { useRef, useState } from 'react';
import { Camera, Trash2, Save, Mail, User } from 'lucide-react';
import { api, getError, getFieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Badge, Button, Card, Input, PageHeader, PasswordInput, STATUS_TONE } from '../components/ui';
import { fmtDate, label } from '../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const dirty = form.name.trim() !== user.name || emailChanged;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = 'Enter a valid email address';
    if (emailChanged && !form.currentPassword) er.currentPassword = 'Enter your current password to change your email';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim() };
      if (emailChanged) payload.currentPassword = form.currentPassword;
      const { data } = await api.patch('/profile', payload);
      setUser(data.user);
      setForm({ name: data.user.name, email: data.user.email, currentPassword: '' });
      toast.success('Profile updated');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast.error('Only PNG, JPG or WebP images are allowed');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be 2MB or smaller');
    const body = new FormData();
    body.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await api.post('/profile/avatar', body);
      setUser(data.user);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      const { data } = await api.delete('/profile/avatar');
      setUser(data.user);
      toast.success('Profile picture removed');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your personal information." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar user={user} size={104} />
            <h2 className="mt-4 text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-mute">{user.email}</p>
            <div className="mt-3 flex gap-2"><Badge tone={STATUS_TONE[user.role]}>{label(user.role)}</Badge></div>
            <p className="mt-3 text-xs text-mute">Member since {fmtDate(user.createdAt)}</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" icon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>Change photo</Button>
              {user.avatar && <Button variant="ghost" icon={Trash2} disabled={uploading} onClick={removePhoto} aria-label="Remove photo" className="hover:!text-bad" />}
            </div>
            <p className="mt-2 text-xs text-mute">PNG, JPG or WebP · up to 2MB</p>
          </div>
        </Card>

        <Card title="Personal information" className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" icon={User} value={form.name} onChange={set('name')} error={errors.name} />
              <Input label="Email" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} />
            </div>
            {emailChanged && <PasswordInput label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} hint="Required to confirm the new email address." />}
            <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>Save changes</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
