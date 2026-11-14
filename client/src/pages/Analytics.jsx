import { useState } from 'react';
import { Gauge, CheckCircle2, AlertTriangle, Timer } from 'lucide-react';
import { api, getError } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import { Card, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { DonutChart, SimpleBars, TimeChart } from '../components/Charts';
import { RangeSelect } from '../components/RangeSelect';
import { useAuth } from '../context/AuthContext';

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="glass animate-fade-up p-5">
      <div className="flex items-center gap-3 text-mute">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const { can } = useAuth();
  const [range, setRange] = useState('30');
  const [interval, setInterval] = useState('');
  const detailed = useFetch(() => api.get('/analytics/detailed', { params: { range, ...(interval && { interval }) } }).then((r) => r.data), [range, interval]);
  const overview = useFetch(() => api.get('/analytics/overview', { params: { range, ...(interval && { interval }) } }).then((r) => r.data), [range, interval]);
  const d = detailed.data;
  const o = overview.data;
  const loading = (detailed.loading && !d) || (overview.loading && !o);
  const error = detailed.error || overview.error;

  const bucketLabel = { day: 'Daily', week: 'Weekly', month: 'Monthly' }[d?.interval || 'day'];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Live numbers calculated from your database."
        actions={
          <>
            <div className="w-36">
              <select className="field py-2" value={interval} onChange={(e) => setInterval(e.target.value)} aria-label="Group by">
                <option value="">Auto grouping</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <RangeSelect value={range} onChange={setRange} />
          </>
        }
      />

      {error && !d ? (
        <Card>
          <ErrorState message={getError(error)} onRetry={() => { detailed.reload(); overview.reload(); }} />
        </Card>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Gauge} label="Task completion rate" value={`${d.taskPerformance.completionRate}%`} sub={`${d.taskPerformance.done} of ${d.taskPerformance.total} tasks done`} />
            <Metric icon={CheckCircle2} label="Project completion" value={`${d.projectCompletion.completionRate}%`} sub={`${d.projectCompletion.completed} of ${d.projectCompletion.total} projects · avg progress ${d.projectCompletion.avgProgress}%`} />
            <Metric icon={AlertTriangle} label="Overdue tasks" value={d.taskPerformance.overdue} sub="Not done and past due date" />
            <Metric icon={Timer} label="Avg. time to complete" value={d.taskPerformance.avgCompletionHours === null ? '—' : d.taskPerformance.avgCompletionHours >= 48 ? `${Math.round(d.taskPerformance.avgCompletionHours / 24)} days` : `${d.taskPerformance.avgCompletionHours} hrs`} sub="For tasks completed in this period" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {can('users:read') && (
              <Card title={`User growth · ${bucketLabel.toLowerCase()} signups`}>
                <TimeChart data={o.charts.userGrowth.map((x) => ({ label: x.label, 'New users': x.count }))} series={[{ key: 'New users', name: 'New users' }]} />
              </Card>
            )}
            <Card title={`Activity overview · ${bucketLabel.toLowerCase()}`}>
              <TimeChart type="bar" data={o.charts.activity.map((x) => ({ label: x.label, Actions: x.count }))} series={[{ key: 'Actions', name: 'Actions' }]} />
            </Card>
            <Card title={`Task performance · ${bucketLabel.toLowerCase()}`} className={can('users:read') ? 'lg:col-span-2' : ''}>
              <TimeChart type="line" data={d.taskTrend.map((x) => ({ label: x.label, Created: x.created, Completed: x.completed }))} series={[{ key: 'Created', name: 'Created' }, { key: 'Completed', name: 'Completed' }]} />
            </Card>
            <Card title="Project completion">
              <DonutChart counts={d.projectStatus} order={['planning', 'active', 'on_hold', 'completed']} />
            </Card>
            <Card title="Tasks by priority">
              <SimpleBars name="Tasks" data={['low', 'medium', 'high', 'urgent'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), value: d.taskPriority[k] || 0 }))} />
            </Card>
            {d.topAssignees.length > 0 && (
              <Card title="Top performers" className="lg:col-span-2">
                <SimpleBars name="Tasks completed" data={d.topAssignees.map((a) => ({ label: a.name, value: a.done }))} height={220} />
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
