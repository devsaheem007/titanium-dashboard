import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserCheck, FolderKanban, ListTodo, TrendingUp, TrendingDown, Plus, UserPlus, Download, Activity as ActivityIcon, Minus } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Card, ErrorState, PageHeader, Skeleton, Avatar, EmptyState, Button } from '../components/ui';
import { DonutChart, TimeChart } from '../components/Charts';
import { RangeSelect } from '../components/RangeSelect';
import { timeAgo, cn } from '../utils/format';

function Growth({ g }) {
  if (!g) return null;
  const Icon = g.change > 0 ? TrendingUp : g.change < 0 ? TrendingDown : Minus;
  const tone = g.change > 0 ? 'text-ok' : g.change < 0 ? 'text-bad' : 'text-mute';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', tone)}>
      <Icon size={13} />
      {g.change > 0 ? '+' : ''}
      {g.change}%
    </span>
  );
}

function StatCard({ icon: Icon, label, value, growth, note, to }) {
  const body = (
    <div className="glass h-full animate-fade-up p-5 transition hover:border-line/25">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-silver">
          <Icon size={19} />
        </span>
        <Growth g={growth} />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value ?? '—'}</p>
      <p className="mt-1 text-sm text-mute">{label}</p>
      {note && <p className="mt-0.5 text-xs text-mute/80">{note}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Overview() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState('30');
  const overview = useFetch(() => api.get('/analytics/overview', { params: { range } }).then((r) => r.data), [range]);
  const activity = useFetch(() => api.get('/activities', { params: { limit: 8 } }).then((r) => r.data.data), []);

  const stats = overview.data?.stats;
  const charts = overview.data?.charts;
  const seeUsers = can('users:read');
  const days = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' }[range];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here's what's happening across your workspace." actions={<RangeSelect value={range} onChange={setRange} />} />

      <div className="mb-6 flex flex-wrap gap-2">
        {can('projects:write') && (
          <Button icon={Plus} onClick={() => navigate('/projects?new=1')}>
            New project
          </Button>
        )}
        <Button variant="ghost" icon={Plus} onClick={() => navigate('/tasks?new=1')}>
          New task
        </Button>
        {can('users:write') && (
          <Button variant="ghost" icon={UserPlus} onClick={() => navigate('/users?new=1')}>
            Add user
          </Button>
        )}
        {can('reports:read') && (
          <Button variant="ghost" icon={Download} onClick={() => navigate('/reports')}>
            Export report
          </Button>
        )}
      </div>

      {overview.error && !overview.data ? (
        <Card>
          <ErrorState message={getError(overview.error)} onRetry={overview.reload} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overview.loading && !overview.data
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[148px] rounded-2xl" />)
              : (
                <>
                  {seeUsers && <StatCard icon={Users} label="Total users" value={stats.totalUsers} growth={stats.growth.users} note={`new in last ${days}`} to="/users" />}
                  {seeUsers && <StatCard icon={UserCheck} label="Active users" value={stats.activeUsers} note={`signed in during last ${days}`} />}
                  <StatCard icon={FolderKanban} label="Total projects" value={stats.totalProjects} growth={stats.growth.projects} note={`new in last ${days}`} to="/projects" />
                  <StatCard icon={ListTodo} label="Pending tasks" value={stats.pendingTasks} growth={stats.growth.tasksCompleted} note={`${stats.overdueTasks} overdue · growth = tasks completed`} to="/tasks" />
                </>
              )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card title={seeUsers ? 'User growth' : 'Activity'} className="lg:col-span-2">
              {overview.loading && !overview.data ? <Skeleton className="h-[260px]" /> : <TimeChart data={seeUsers ? charts.userGrowth.map((d) => ({ label: d.label, 'New users': d.count })) : charts.activity.map((d) => ({ label: d.label, Activity: d.count }))} series={[{ key: seeUsers ? 'New users' : 'Activity', name: seeUsers ? 'New users' : 'Activity' }]} />}
            </Card>
            <Card title="Task status">
              {overview.loading && !overview.data ? <Skeleton className="h-[240px]" /> : <DonutChart counts={charts.taskStatus} order={['todo', 'in_progress', 'review', 'done']} />}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title="Project status">
              {overview.loading && !overview.data ? <Skeleton className="h-[240px]" /> : <DonutChart counts={charts.projectStatus} order={['planning', 'active', 'on_hold', 'completed']} />}
            </Card>
            <Card title="Recent activity" className="lg:col-span-2" action={<Link to="/notifications" className="text-xs text-mute hover:text-ink">View all</Link>} padded={false}>
              {activity.loading && !activity.data ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : activity.error ? (
                <ErrorState message={getError(activity.error)} onRetry={activity.reload} />
              ) : activity.data?.length === 0 ? (
                <EmptyState icon={ActivityIcon} title="No activity yet" description="Actions like creating projects or tasks will show up here." />
              ) : (
                <ol className="relative px-5 py-4">
                  {activity.data.map((a) => (
                    <li key={a._id} className="relative flex gap-3 pb-4 last:pb-0">
                      <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-line/10 last:hidden" />
                      <Avatar user={a.actor} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{a.message}</p>
                        <p className="text-xs text-mute">{timeAgo(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
