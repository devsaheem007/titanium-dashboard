import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { label as titleCase } from '../utils/format';

export function usePalette() {
  const { user } = useAuth();
  const light = user?.theme === 'light';
  return {
    light,
    grid: light ? 'rgba(20,22,26,0.1)' : 'rgba(255,255,255,0.07)',
    axis: light ? '#666c76' : '#8b9098',
    series: light ? ['#343840', '#3b6fb6', '#228c5a', '#b06e14', '#c83c3c'] : ['#cdd2da', '#7da8e0', '#6ec496', '#e0b163', '#e47676'],
    byKey: light
      ? { planning: '#9096a0', active: '#3b6fb6', on_hold: '#b06e14', completed: '#228c5a', todo: '#9096a0', in_progress: '#3b6fb6', review: '#b06e14', done: '#228c5a', low: '#9096a0', medium: '#3b6fb6', high: '#b06e14', urgent: '#c83c3c' }
      : { planning: '#8b9098', active: '#7da8e0', on_hold: '#e0b163', completed: '#6ec496', todo: '#8b9098', in_progress: '#7da8e0', review: '#e0b163', done: '#6ec496', low: '#8b9098', medium: '#7da8e0', high: '#e0b163', urgent: '#e47676' },
  };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs shadow-glass">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-mute">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {titleCase(String(p.name))}: <span className="font-medium text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const gid = (key) => `grad-${String(key).replace(/\W/g, '')}`;

export const ChartEmpty = ({ text = 'No data in this period yet.' }) => <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-mute">{text}</div>;

const hasData = (data) => data?.some((d) => Object.entries(d).some(([k, v]) => k !== 'label' && typeof v === 'number' && v > 0));

// Time series. series = [{ key, name }]
export function TimeChart({ data, series, type = 'area', height = 260 }) {
  const p = usePalette();
  if (!hasData(data)) return <div style={{ height }}><ChartEmpty /></div>;
  const Chart = type === 'area' ? AreaChart : type === 'bar' ? BarChart : LineChart;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={gid(s.key)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.series[i]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={p.series[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={p.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: p.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fill: p.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: p.grid }} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: p.axis }} />}
          {series.map((s, i) =>
            type === 'area' ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={p.series[i]} strokeWidth={2} fill={`url(#${gid(s.key)})`} />
            ) : type === 'bar' ? (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={p.series[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={p.series[i]} strokeWidth={2} dot={false} />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut from an object like { active: 3, completed: 2 }
export function DonutChart({ counts, order, height = 240 }) {
  const p = usePalette();
  const keys = order || Object.keys(counts || {});
  const data = keys.map((k) => ({ name: titleCase(k), key: k, value: counts?.[k] || 0 })).filter((d) => d.value > 0);
  if (!data.length) return <div style={{ height }}><ChartEmpty /></div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
            {data.map((d) => (
              <Cell key={d.key} fill={p.byKey[d.key] || p.series[0]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: p.axis }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex -translate-y-3 flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{total}</span>
        <span className="text-[11px] text-mute">total</span>
      </div>
    </div>
  );
}

// Horizontal-ish simple bars from [{label, value}]
export function SimpleBars({ data, dataKey = 'value', name = 'Value', height = 240 }) {
  const p = usePalette();
  if (!data?.length) return <div style={{ height }}><ChartEmpty /></div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={p.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: p.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: p.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: p.grid }} />
          <Bar dataKey={dataKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={p.byKey[d.key] || p.series[i % p.series.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
