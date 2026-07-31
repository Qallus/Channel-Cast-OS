"use client";

// Lightweight, dependency-free SVG charts on the Channel Cast design tokens.
// Single-series marks use the brand hue (no categorical palette to validate);
// the status breakdown uses the reserved status palette with a labelled legend.
// Every mark carries a native <title> tooltip (identity is never color-alone).

import { cn } from "@/lib/utils";

const BRAND = "hsl(var(--brand))";
const GRID = "hsl(var(--border))";
const num = new Intl.NumberFormat("en-US");

/* ── Area + line (single series over time) ───────────────────────────── */

export function AreaLine({
  data,
  labels,
  height = 200,
  formatY = (n: number) => num.format(n),
}: {
  data: number[];
  labels: string[];
  height?: number;
  formatY?: (n: number) => string;
}) {
  const W = 640;
  const H = height;
  const padX = 8;
  const padTop = 12;
  const padBottom = 22;
  const max = Math.max(1, ...data);
  const innerH = H - padTop - padBottom;
  const stepX = (W - padX * 2) / Math.max(1, data.length - 1);
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;
  const gridLines = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" className="overflow-visible">
      {gridLines.map((g) => {
        const gy = padTop + innerH - g * innerH;
        return (
          <g key={g}>
            <line x1={padX} x2={W - padX} y1={gy} y2={gy} stroke={GRID} strokeWidth={1} />
            <text x={padX} y={gy - 3} className="fill-muted-foreground" fontSize={10}>{formatY(g * max)}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
          <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-fill)" />
      <path d={linePath} fill="none" stroke={BRAND} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={8} fill="transparent" className="[&:hover+circle]:opacity-100">
            <title>{labels[i]}: {formatY(v)}</title>
          </circle>
          <circle cx={x(i)} cy={y(v)} r={3} fill={BRAND} className="opacity-0 transition-opacity" pointerEvents="none" />
        </g>
      ))}
      {labels.map((l, i) => (
        (i === 0 || i === labels.length - 1 || i === Math.floor(labels.length / 2)) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="fill-muted-foreground" fontSize={10}>{l}</text>
        )
      ))}
    </svg>
  );
}

/* ── Vertical columns (single series) ────────────────────────────────── */

export function Columns({
  data,
  height = 200,
  formatY = (n: number) => num.format(n),
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatY?: (n: number) => string;
}) {
  const W = 640;
  const H = height;
  const padTop = 12;
  const padBottom = 22;
  const gap = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const innerH = H - padTop - padBottom;
  const bw = (W - gap * (data.length + 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img">
      <line x1={0} x2={W} y1={padTop + innerH} y2={padTop + innerH} stroke={GRID} strokeWidth={1} />
      {data.map((d, i) => {
        const bh = (d.value / max) * innerH;
        const bx = gap + i * (bw + gap);
        const by = padTop + innerH - bh;
        return (
          <g key={i} className="group">
            <rect x={bx} y={by} width={bw} height={Math.max(2, bh)} rx={4} fill={BRAND} className="opacity-85 transition-opacity group-hover:opacity-100">
              <title>{d.label}: {formatY(d.value)}</title>
            </rect>
            <text x={bx + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Horizontal ranking bars (single hue) ────────────────────────────── */

export function RankBars({
  data,
  formatV = (n: number) => num.format(n),
}: {
  data: { label: string; value: number }[];
  formatV?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={d.label}>{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" title={`${d.label}: ${formatV(d.value)}`}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-20 shrink-0 text-right text-xs font-medium text-foreground">{formatV(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut (status breakdown; reserved palette + legend) ─────────────── */

export function Donut({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = size / 2;
  const stroke = 18;
  const radius = r - stroke / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <g transform={`rotate(-90 ${r} ${r})`}>
          {data.map((d) => {
            const frac = d.value / total;
            const dash = frac * circ;
            const seg = (
              <circle
                key={d.label}
                cx={r}
                cy={r}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{d.label}: {num.format(d.value)} ({Math.round(frac * 100)}%)</title>
              </circle>
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x={r} y={r - 2} textAnchor="middle" className="fill-foreground" fontSize={20} fontWeight={600}>{num.format(total)}</text>
        <text x={r} y={r + 16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>total</text>
      </svg>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium text-foreground">{num.format(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Shared status colors (reserved palette) for breakdowns. */
export const STATUS_COLORS = {
  good: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  offline: "hsl(var(--muted-foreground))",
  error: "hsl(var(--destructive))",
};

export function ChartCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
