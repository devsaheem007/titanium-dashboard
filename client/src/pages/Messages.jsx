import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, MessageSquare, Plus } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Button, EmptyState, ErrorState, PageHeader, Select, Skeleton, Spinner } from '../components/ui';
import { useDirectory } from './Projects';
import { cn, timeAgo, fmtDateTime } from '../utils/format';

export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const directory = useDirectory();
  const convos = useFetch(() => api.get('/messages/conversations').then((r) => r.data.data), []);
  const [active, setActive] = useState(null); // user object of the open conversation
  const [thread, setThread] = useState({ loading: false, items: [] });
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);

  const loadThread = async (id, silent) => {
    if (!silent) setThread((t) => ({ ...t, loading: true }));
    try {
      const { data } = await api.get(`/messages/thread/${id}`);
      setThread({ loading: false, items: data.data });
    } catch (err) {
      setThread((t) => ({ ...t, loading: false }));
      if (!silent) toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (!active) return undefined;
    setThread({ loading: true, items: [] });
    loadThread(active._id, true);
    const t = setInterval(() => { loadThread(active._id, true); convos.reload(true); }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?._id]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.items.length]);

  const open = (u) => {
    setActive(u);
    setTimeout(() => convos.reload(true), 600); // the thread request marks messages read
  };

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !active) return;
    setSending(true);
    try {
      const { data } = await api.post('/messages', { to: active._id, body: text });
      setThread((t) => ({ ...t, items: [...t.items, data.message] }));
      setBody('');
      convos.reload(true);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSending(false);
    }
  };

  const startNew = (id) => {
    if (!id) return;
    const u = directory.data.find((x) => x._id === id);
    if (u) open(u);
  };

  const people = directory.data?.filter((u) => u._id !== user._id) || [];

  return (
    <>
      <PageHeader title="Messages" subtitle="Direct messages with your team." />
      <div className="glass grid h-[calc(100vh-12rem)] min-h-[480px] overflow-hidden lg:grid-cols-[320px_1fr]">
        {/* conversation list */}
        <div className={cn('flex min-h-0 flex-col border-r', active && 'hidden lg:flex')}>
          <div className="border-b p-3">
            <Select compact value="" onChange={(e) => startNew(e.target.value)} aria-label="Start a new conversation">
              <option value="">+ New conversation…</option>
              {people.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.loading && !convos.data ? (
              <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : convos.error && !convos.data ? (
              <ErrorState message={getError(convos.error)} onRetry={convos.reload} />
            ) : convos.data.length === 0 ? (
              <EmptyState icon={Plus} title="No conversations yet" description="Pick someone above to say hello." />
            ) : (
              convos.data.map((c) => (
                <button key={c.user._id} onClick={() => open(c.user)} className={cn('flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-raised/50', active?._id === c.user._id && 'bg-raised/70')}>
                  <Avatar user={c.user} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{c.user.name}</span><span className="shrink-0 text-[11px] text-mute">{timeAgo(c.lastMessage.createdAt)}</span></span>
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-xs text-mute">{c.lastMessage.fromMe ? 'You: ' : ''}{c.lastMessage.body}</span>{c.unread > 0 && <span className="rounded-full bg-silver px-1.5 text-[10px] font-bold text-on-silver">{c.unread}</span>}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* thread */}
        <div className={cn('flex min-h-0 flex-col', !active && 'hidden lg:flex')}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center"><EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a conversation on the left or start a new one." /></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <button className="icon-btn lg:hidden" onClick={() => setActive(null)} aria-label="Back to conversations"><ArrowLeft size={18} /></button>
                <Avatar user={active} size={36} />
                <div className="min-w-0"><p className="truncate text-sm font-medium">{active.name}</p><p className="truncate text-xs text-mute">{active.email}</p></div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {thread.loading ? <div className="flex justify-center pt-10 text-mute"><Spinner /></div> : thread.items.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-mute">No messages yet. Say hello 👋</p>
                ) : thread.items.map((m) => {
                  const mine = m.from === user._id;
                  return (
                    <div key={m._id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-md bg-silver text-on-silver' : 'rounded-bl-md bg-raised')}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={cn('mt-1 text-[10px]', mine ? 'text-on-silver/60' : 'text-mute')}>{fmtDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t p-3">
                <input className="field" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" maxLength={2000} aria-label="Message" />
                <Button type="submit" loading={sending} disabled={!body.trim()} icon={Send} aria-label="Send"><span className="hidden sm:inline">Send</span></Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
