import { Link } from 'react-router-dom';

export function Logo({ size = 32, name = 'Titanium', showName = true }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={name}>
      <span className="flex items-center justify-center rounded-lg bg-gradient-to-br from-silver/90 to-mute/70 text-on-silver shadow-soft" style={{ width: size, height: size }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 5h16v4h-6v10h-4V9H4z" />
        </svg>
      </span>
      {showName && <span className="text-[15px] font-semibold tracking-tight">{name}</span>}
    </Link>
  );
}
