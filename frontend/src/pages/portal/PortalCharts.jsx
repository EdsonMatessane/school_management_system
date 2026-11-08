const compact = new Intl.NumberFormat('pt-MZ', { notation: 'compact', maximumFractionDigits: 1 });

const niceMax = (max) => {
  if (!(max > 0)) return 4;
  const power = 10 ** Math.floor(Math.log10(max));
  const ratio = max / power;
  const step = ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10;
  return step * power;
};

const shorten = (text, size = 9) => {
  const value = String(text ?? '');
  return value.length > size ? `${value.slice(0, size - 1)}…` : value;
};

export function DonutChart({ segments }) {
  const size = 220;
  const thickness = 16;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const visible = segments.filter((item) => item.value > 0).length;
  const gap = visible > 1 ? 10 : 0;
  let offset = 0;

  return (
    <div className="portal-donut">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico circular">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`} fill="none" strokeWidth={thickness}>
          <circle cx={size / 2} cy={size / 2} r={radius} style={{ stroke: 'var(--portal-track)' }} />
          {total > 0 && segments.map((item) => {
            if (item.value <= 0) return null;
            const length = Math.max(0, (item.value / total) * circumference - gap);
            const node = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                style={{ stroke: item.color }}
                strokeLinecap="round"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += (item.value / total) * circumference;
            return node;
          })}
        </g>
      </svg>
      <ul className="portal-legend">
        {segments.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.label}
            <strong>{item.value.toLocaleString('pt-MZ')}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarChart({ labels, values, palette = ['var(--portal-chart-1)', 'var(--portal-chart-2)', 'var(--portal-chart-3)'], format = (value) => compact.format(value) }) {
  const width = 560;
  const height = 270;
  const left = 46;
  const right = 8;
  const top = 12;
  const bottom = 32;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = niceMax(Math.max(0, ...values));
  const ticks = [0, 1, 2, 3, 4].map((index) => (max / 4) * index);
  const slot = plotWidth / Math.max(values.length, 1);
  const barWidth = Math.min(48, slot * 0.55);
  const y = (value) => top + plotHeight - (value / max) * plotHeight;

  return (
    <div className="portal-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de barras">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} strokeDasharray="3 4" style={{ stroke: 'var(--portal-grid)' }} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" style={{ fill: 'var(--portal-axis)' }}>{format(tick)}</text>
          </g>
        ))}
        {values.map((value, index) => {
          const x = left + slot * index + (slot - barWidth) / 2;
          const barHeight = top + plotHeight - y(value);
          return (
            <g key={`${labels[index]}-${index}`}>
              <rect
                x={x}
                y={y(value)}
                width={barWidth}
                height={Math.max(barHeight, 0)}
                rx="3"
                style={{ fill: palette[index % palette.length] }}
              >
                <title>{`${labels[index]}: ${format(value)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="11" style={{ fill: 'var(--portal-axis)' }}>
                {shorten(labels[index], values.length > 8 ? 6 : 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
