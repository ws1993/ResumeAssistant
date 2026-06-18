import { useMemo } from 'react';

import type { Scores } from '@/schema/jdAnalysis';

interface RadarChartProps {
  scores: Scores;
  size?: number;
}

const LABELS: { key: keyof Scores; label: string }[] = [
  { key: 'keywords', label: '关键词' },
  { key: 'relevance', label: '相关度' },
  { key: 'quantified', label: '量化' },
  { key: 'expression', label: '表达' },
  { key: 'format', label: '结构' },
];

export function RadarChart({ scores, size = 220 }: RadarChartProps): React.JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;

  const points = useMemo(() => {
    const total = LABELS.length;
    return LABELS.map((l, i) => {
      const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
      const value = Math.max(0, Math.min(100, scores[l.key] ?? 0));
      const r = (radius * value) / 100;
      return {
        key: l.key,
        label: l.label,
        value,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        lx: cx + Math.cos(angle) * (radius + 14),
        ly: cy + Math.sin(angle) * (radius + 14),
        gx: cx + Math.cos(angle) * radius,
        gy: cy + Math.sin(angle) * radius,
      };
    });
  }, [scores, cx, cy, radius]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]">
      {gridLevels.map((lv, i) => {
        const r = radius * lv;
        const pts = LABELS.map((_, j) => {
          const angle = (Math.PI * 2 * j) / LABELS.length - Math.PI / 2;
          return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
        }).join(' ');
        return (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="currentColor"
            opacity={0.15}
            strokeWidth={1}
          />
        );
      })}

      {points.map((p, i) => (
        <line
          key={`spoke-${i}`}
          x1={cx}
          y1={cy}
          x2={p.gx}
          y2={p.gy}
          stroke="currentColor"
          opacity={0.12}
        />
      ))}

      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="currentColor"
        className="text-primary"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={1.5}
      />

      {points.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={2.5} fill="currentColor" className="text-primary" />
      ))}

      {points.map((p) => (
        <text
          key={`l-${p.key}`}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-current text-[10px] text-muted-foreground"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
