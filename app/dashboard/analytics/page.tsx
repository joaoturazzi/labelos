"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  totalSubmissions: number;
  avgScore: number | null;
  approvalRate: number;
  avgDecisionHours: number | null;
  weeklySubmissions: { week: string; count: number }[];
  statusBreakdown: { pending: number; reviewing: number; approved: number; rejected: number };
  monthlyScores: { month: string; avg: number; count: number }[];
  genreDistribution: { name: string; value: number }[];
}

// ── Stat Card ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-bg border border-border rounded-[8px] p-[12px_14px]">
      <p className="text-[11px] font-semibold text-text4 uppercase tracking-[0.05em] m-0">{label}</p>
      <p className="text-[26px] font-bold tracking-[-0.5px] m-0 mt-1" style={{ color: color || "var(--color-text)" }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-text4 m-0 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Bar Chart (SVG) ──────────────────────────────────────────────────

function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 600, h = 200, pad = { t: 10, r: 10, b: 30, l: 40 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const barW = Math.min(cw / data.length - 4, 36);

  return (
    <div className="bg-bg border border-border rounded-[8px] p-4">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 220 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={pad.t + ch * (1 - r)} y2={pad.t + ch * (1 - r)}
              stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={pad.l - 6} y={pad.t + ch * (1 - r) + 3} textAnchor="end"
              fill="var(--color-text4)" fontSize={9} fontFamily="inherit">
              {Math.round(max * r)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + (i / data.length) * cw + (cw / data.length - barW) / 2;
          const barH = (d.value / max) * ch;
          return (
            <g key={i}>
              <rect x={x} y={pad.t + ch - barH} width={barW} height={barH}
                fill="var(--color-text)" rx={3} opacity={0.85} />
              <text x={x + barW / 2} y={h - 6} textAnchor="middle"
                fill="var(--color-text4)" fontSize={8} fontFamily="inherit">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Line Chart (SVG) ─────────────────────────────────────────────────

function LineChart({ data, label, color = "var(--color-text)" }: {
  data: { label: string; value: number }[]; label: string; color?: string;
}) {
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const range = max - min || 1;
  const w = 600, h = 180, pad = { t: 15, r: 15, b: 30, l: 40 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;

  const points = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.t + ch - ((d.value - min) / range) * ch,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="bg-bg border border-border rounded-[8px] p-4">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">{label}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
        {[0, 0.5, 1].map((r, i) => (
          <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + ch * (1 - r)} y2={pad.t + ch * (1 - r)}
            stroke="var(--color-border)" strokeWidth={0.5} />
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-bg)" stroke={color} strokeWidth={2} />
        ))}
        {data.map((d, i) => (
          <text key={i} x={points[i].x} y={h - 6} textAnchor="middle"
            fill="var(--color-text4)" fontSize={8} fontFamily="inherit">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Donut Chart (SVG) ────────────────────────────────────────────────

const DONUT_COLORS = ["#1e8449", "#d68910", "#c0392b", "#1a5276", "#8e44ad", "#555", "#e67e22", "#2ecc71"];

function DonutChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70, cx = 90, cy = 90, strokeW = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="bg-bg border border-border rounded-[8px] p-4">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">{label}</p>
      <div className="flex items-center gap-6">
        <svg width={180} height={180} viewBox="0 0 180 180">
          {data.map((d, i) => {
            const pct = d.value / total;
            const dashLen = pct * circ;
            const dashOffset = -offset * circ;
            offset += pct;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={strokeW}
                strokeDasharray={`${dashLen} ${circ - dashLen}`}
                strokeDashoffset={dashOffset} transform={`rotate(-90 ${cx} ${cy})`} />
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--color-text)" fontSize={22} fontWeight={700}>
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--color-text4)" fontSize={10}>
            total
          </text>
        </svg>
        <div className="flex flex-col gap-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-[12px] text-text">{d.name}</span>
              <span className="text-[11px] text-text4 ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Status Breakdown ─────────────────────────────────────────────────

function StatusBar({ data }: { data: { pending: number; reviewing: number; approved: number; rejected: number } }) {
  const total = data.pending + data.reviewing + data.approved + data.rejected || 1;
  const segments = [
    { key: "Aprovadas", value: data.approved, color: "#1e8449" },
    { key: "Em análise", value: data.reviewing, color: "#555" },
    { key: "Pendentes", value: data.pending, color: "#d68910" },
    { key: "Rejeitadas", value: data.rejected, color: "#c0392b" },
  ];

  return (
    <div className="bg-bg border border-border rounded-[8px] p-4">
      <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-3">
        Taxa de aprovação vs rejeição
      </p>
      <div className="flex rounded-[5px] overflow-hidden h-3 mb-3">
        {segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: s.value > 0 ? 4 : 0 }} />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] text-text3">{s.key}: {s.value} ({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-[13px] text-text4 text-center py-16">Carregando métricas...</div>;
  }

  if (!data || data.totalSubmissions === 0) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Nenhuma demo recebida ainda. As métricas aparecerão aqui quando as primeiras submissions chegarem.
      </div>
    );
  }

  return (
    <div className="max-w-[900px]">
      <h2 className="text-[22px] font-bold text-text tracking-[-0.3px] mb-6">Analytics</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <StatCard label="Total de demos" value={String(data.totalSubmissions)} />
        <StatCard label="Score médio" value={data.avgScore !== null ? `${data.avgScore}/100` : "—"}
          color={data.avgScore && data.avgScore >= 70 ? "var(--color-success)" : data.avgScore && data.avgScore >= 40 ? "var(--color-warning)" : undefined} />
        <StatCard label="Taxa de aprovação" value={`${data.approvalRate}%`}
          color="var(--color-success)" />
        <StatCard label="Tempo médio de decisão"
          value={data.avgDecisionHours !== null ? (data.avgDecisionHours < 24 ? `${data.avgDecisionHours}h` : `${Math.round(data.avgDecisionHours / 24)}d`) : "—"}
          sub={data.avgDecisionHours !== null ? "entre submissão e decisão" : undefined} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <BarChart
          data={data.weeklySubmissions.map((w) => ({ label: w.week, value: w.count }))}
          label="Submissions por semana"
        />
        <StatusBar data={data.statusBreakdown} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <LineChart
          data={data.monthlyScores.map((m) => ({ label: m.month, value: m.avg }))}
          label="Score médio da IA por mês"
          color="var(--color-warning)"
        />
        <DonutChart data={data.genreDistribution} label="Gêneros mais submetidos" />
      </div>
    </div>
  );
}
