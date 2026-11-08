import { useState } from 'react';

const palette = [
  '#0b2a4a', '#c0392b', '#2f80ed', '#27ae60', '#f2994a',
  '#9b51e0', '#00a3a3', '#e0a800', '#7f8c8d', '#d6336c',
];

const compact = (value) => {
  const number = Number(value);
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 10_000) return `${(number / 1_000).toFixed(0)}k`;
  return number.toLocaleString('pt-MZ', { maximumFractionDigits: 1 });
};

const niceMax = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const Empty = () => <p style={{ margin: 0, opacity: 0.7 }}>Sem dados para mostrar.</p>;

function Legend({ items }) {
  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
      {items.map(({ label, color, value }) => (
        <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
          {label}{value !== undefined && <strong>&nbsp;{value}</strong>}
        </li>
      ))}
    </ul>
  );
}

export function BarChart({ labels, series }) {
  const [hover, setHover] = useState(null);
  const values = series[0]?.values.map(Number) ?? [];
  if (!values.length || values.every((value) => value === 0)) return <Empty />;
  const horizontal = labels.some((label) => label.length > 8) && labels.length <= 12;
  const max = niceMax(Math.max(...values));
  if (horizontal) {
    const rowHeight = 28;
    const height = labels.length * rowHeight + 8;
    return (
      <svg viewBox={`0 0 600 ${height}`} role="img" style={{ width: '100%', height: 'auto' }}>
        {labels.map((label, index) => {
          const width = (values[index] / max) * 330;
          return (
            <g key={label} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
              <text x="0" y={index * rowHeight + 18} fontSize="12" fill="currentColor">
                {label.length > 26 ? `${label.slice(0, 25)}…` : label}
              </text>
              <rect
                x="200"
                y={index * rowHeight + 5}
                width={Math.max(width, 2)}
                height="16"
                rx="3"
                fill={palette[0]}
                opacity={hover === null || hover === index ? 1 : 0.55}
              />
              <text x={206 + width} y={index * rowHeight + 18} fontSize="12" fill="currentColor">
                {compact(values[index])}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
  const width = 600;
  const height = 240;
  const left = 44;
  const bottom = 28;
  const slot = (width - left) / values.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: '100%', height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = 10 + (height - bottom - 10) * (1 - tick);
        return (
          <g key={tick}>
            <line x1={left} x2={width} y1={y} y2={y} stroke="currentColor" opacity="0.12" />
            <text x={left - 6} y={y + 4} fontSize="11" textAnchor="end" fill="currentColor" opacity="0.7">
              {compact(max * tick)}
            </text>
          </g>
        );
      })}
      {values.map((value, index) => {
        const barHeight = (value / max) * (height - bottom - 10);
        const x = left + index * slot + slot * 0.18;
        return (
          <g key={labels[index]} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
            <rect
              x={x}
              y={height - bottom - barHeight}
              width={slot * 0.64}
              height={Math.max(barHeight, 0)}
              rx="3"
              fill={palette[0]}
              opacity={hover === null || hover === index ? 1 : 0.55}
            />
            {(hover === index || values.length <= 8) && value > 0 && (
              <text x={x + slot * 0.32} y={height - bottom - barHeight - 5} fontSize="11" textAnchor="middle" fill="currentColor">
                {compact(value)}
              </text>
            )}
            <text x={x + slot * 0.32} y={height - 10} fontSize="11" textAnchor="middle" fill="currentColor" opacity="0.8">
              {labels[index]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ labels, series }) {
  const all = series.flatMap((item) => item.values.map(Number));
  if (!all.length || all.every((value) => value === 0)) return <Empty />;
  const width = 600;
  const height = 240;
  const left = 44;
  const bottom = 28;
  const max = niceMax(Math.max(...all));
  const step = (width - left - 10) / Math.max(labels.length - 1, 1);
  const point = (value, index) => [
    left + index * step,
    10 + (height - bottom - 10) * (1 - Number(value) / max),
  ];
  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = 10 + (height - bottom - 10) * (1 - tick);
          return (
            <g key={tick}>
              <line x1={left} x2={width} y1={y} y2={y} stroke="currentColor" opacity="0.12" />
              <text x={left - 6} y={y + 4} fontSize="11" textAnchor="end" fill="currentColor" opacity="0.7">
                {compact(max * tick)}
              </text>
            </g>
          );
        })}
        {series.map((item, seriesIndex) => (
          <g key={item.name}>
            <polyline
              fill="none"
              stroke={palette[seriesIndex % palette.length]}
              strokeWidth="2.5"
              points={item.values.map((value, index) => point(value, index).join(',')).join(' ')}
            />
            {item.values.map((value, index) => {
              const [x, y] = point(value, index);
              return (
                <circle key={labels[index]} cx={x} cy={y} r="3.5" fill={palette[seriesIndex % palette.length]}>
                  <title>{`${item.name} · ${labels[index]}: ${compact(value)}`}</title>
                </circle>
              );
            })}
          </g>
        ))}
        {labels.map((label, index) => (
          <text key={label} x={left + index * step} y={height - 10} fontSize="11" textAnchor="middle" fill="currentColor" opacity="0.8">
            {label}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <Legend items={series.map((item, index) => ({ label: item.name, color: palette[index % palette.length] }))} />
      )}
    </>
  );
}

export function PieChart({ labels, series }) {
  const values = series[0]?.values.map(Number) ?? [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return <Empty />;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <>
      <svg viewBox="0 0 200 200" role="img" style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block', margin: '0 auto' }}>
        <g transform="rotate(-90 100 100)">
          {values.map((value, index) => {
            const length = (value / total) * circumference;
            const segment = (
              <circle
                key={labels[index]}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={palette[index % palette.length]}
                strokeWidth="34"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              >
                <title>{`${labels[index]}: ${compact(value)} (${((value / total) * 100).toFixed(1)}%)`}</title>
              </circle>
            );
            offset += length;
            return segment;
          })}
        </g>
        <text x="100" y="98" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">{compact(total)}</text>
        <text x="100" y="116" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">total</text>
      </svg>
      <Legend
        items={labels.map((label, index) => ({
          label,
          color: palette[index % palette.length],
          value: `${((values[index] / total) * 100).toFixed(0)}%`,
        }))}
      />
    </>
  );
}

export function Chart({ chart }) {
  if (chart.type === 'pie') return <PieChart labels={chart.labels} series={chart.series} />;
  if (chart.type === 'line') return <LineChart labels={chart.labels} series={chart.series} />;
  return <BarChart labels={chart.labels} series={chart.series} />;
}
