"use client";

interface DataPoint {
  date: string;
  followers: number;
}

interface Props {
  data: DataPoint[];
}

export function GrowthChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="text-[13px] text-text4 text-center py-8">
        Dados insuficientes para grafico.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = Math.min(...data.map((d) => d.followers));
  const maxVal = Math.max(...data.map((d) => d.followers));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.followers - minVal) / range) * chartH,
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Y axis ticks
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minVal + (range * i) / yTicks;
    return {
      y: padding.top + chartH - (i / yTicks) * chartH,
      label: val >= 1000 ? (val / 1000).toFixed(1) + "K" : Math.round(val).toString(),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 220 }}
    >
      {/* Grid lines */}
      {yLabels.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--color-border)"
            strokeWidth={0.5}
          />
          <text
            x={padding.left - 8}
            y={tick.y + 3}
            textAnchor="end"
            fill="var(--color-text4)"
            fontSize={9}
            fontFamily="inherit"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {points
        .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0)
        .map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fill="var(--color-text4)"
            fontSize={9}
            fontFamily="inherit"
          >
            {new Date(p.date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </text>
        ))}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-text)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--color-bg)"
          stroke="var(--color-text)"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
