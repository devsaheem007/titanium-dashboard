import { Select } from './ui';

export const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export function RangeSelect({ value, onChange }) {
  return (
    <div className="w-44">
      <Select compact value={value} onChange={(e) => onChange(e.target.value)} aria-label="Date range">
        {RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
