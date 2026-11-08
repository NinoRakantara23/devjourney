import { TrendingUp } from 'lucide-react';
import { Card, SectionHeader } from '../ui';
import type { DashboardData } from '../../types';

export default function WeeklyActivity({
  weekly,
  className = '',
}: {
  weekly: DashboardData['weekly'];
  className?: string;
}) {
  const total = weekly.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(1, ...weekly.map((day) => day.count));
  const plot = { left: 30, right: 350, top: 4, bottom: 56 };
  const step = weekly.length > 1 ? (plot.right - plot.left) / (weekly.length - 1) : 0;

  const points = weekly.map((day, index) => ({
    ...day,
    x: plot.left + index * step,
    y: plot.bottom - (day.count / max) * (plot.bottom - plot.top),
  }));

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1].x} ${plot.bottom} L${points[0].x} ${plot.bottom} Z`
      : '';
  const last = points.length > 0 ? points[points.length - 1] : undefined;
  const tickValues = Array.from(new Set([0, Math.round(max / 2), max])).sort((a, b) => a - b);
  const yTicks = tickValues.map((value) => ({
    value,
    y: plot.bottom - (value / max) * (plot.bottom - plot.top),
  }));

  return (
    <Card className={`p-4 ${className}`}>
      <SectionHeader
        title="Weekly Activity"
        subtitle="Tugas selesai 7 hari terakhir"
        aside={
          <span className="flex items-center gap-1 rounded-full bg-brandSoft px-2 py-1 text-[9.5px] font-bold text-brand dark:text-violet-200">
            <TrendingUp size={12} aria-hidden /> {total} done
          </span>
        }
      />

      <div className="rounded-[16px] bg-soft2 p-2.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden /> Tasks completed
          </span>
          <span className="text-[9.5px] font-medium text-muted">This week</span>
        </div>

        {points.length > 0 ? (
          <svg
            viewBox="0 0 360 80"
            className="w-full"
            role="img"
            aria-label={`Aktivitas mingguan: ${total} tugas selesai dalam 7 hari terakhir`}
          >
            <defs>
              <linearGradient id="weekly-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7c41f5" stopOpacity=".28" />
                <stop offset="1" stopColor="#7c41f5" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={plot.left}
                  x2={plot.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="var(--line)"
                  strokeDasharray="3 6"
                />
                <text x={plot.left - 7} y={tick.y + 3} textAnchor="end" fontSize="8" fill="var(--muted)">
                  {tick.value}
                </text>
              </g>
            ))}

            <path d={area} fill="url(#weekly-area)" />
            <path
              d={line}
              fill="none"
              stroke="#7c41f5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {last ? (
              <line
                x1={last.x}
                x2={last.x}
                y1={plot.top}
                y2={plot.bottom}
                stroke="#c9b8ff"
                strokeDasharray="3 4"
              />
            ) : null}

            {points.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 4 : 2.6}
                fill={index === points.length - 1 ? '#7c41f5' : 'var(--card)'}
                stroke="#7c41f5"
                strokeWidth="1.6"
              />
            ))}

            {points.map((point, index) => (
              <text
                key={`label-${point.label}-${index}`}
                x={point.x}
                y={plot.bottom + 15}
                textAnchor="middle"
                fontSize="8.5"
                fill="var(--muted)"
              >
                {point.label}
              </text>
            ))}
          </svg>
        ) : (
          <p className="py-8 text-center text-[11px] text-muted">Belum ada aktivitas mingguan.</p>
        )}
      </div>
    </Card>
  );
}
