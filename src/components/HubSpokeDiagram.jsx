export default function HubSpokeDiagram({ hub, spokes, className }) {
  const width = 820;
  const height = 420;
  const padding = 60;
  const leftX = padding;
  const rightX = width - padding;
  const topStops = [...spokes]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const maxValue = Math.max(...topStops.map((spoke) => spoke.value), 1);
  const panelClass = ["panel", className].filter(Boolean).join(" ");
  const nodeHeight = 28;
  const gap = (height - nodeHeight * topStops.length) / (topStops.length + 1);
  const colors = [
    "#1d4ed8",
    "#0ea5e9",
    "#22c55e",
    "#14b8a6",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#3b82f6",
    "#84cc16",
    "#f97316",
  ];

  return (
    <div className={panelClass}>
      <strong>Destination Traffic Flow</strong>
      <div className="sankey-wrap">
        <svg viewBox={`0 0 ${width} ${height}`}>
          <rect
            x={leftX - 24}
            y={height / 2 - 32}
            width="48"
            height="64"
            rx="14"
            fill="#1d4ed8"
            opacity="0.14"
          />
          <rect
            x={leftX - 14}
            y={height / 2 - 20}
            width="28"
            height="40"
            rx="10"
            fill="#1d4ed8"
          />
          <text
            x={leftX}
            y={height / 2 + 46}
            textAnchor="middle"
            fontSize="13"
            fill="#1f3b7a"
            fontWeight="600"
          >
            {hub}
          </text>
          {topStops.map((spoke, index) => {
            const y = gap + index * (nodeHeight + gap) + nodeHeight / 2;
            const rankWeight =
              topStops.length > 1
                ? 1 - index / (topStops.length - 1)
                : 1;
            const thickness = 4 + Math.pow(rankWeight, 2) * 18;
            const curve = (rightX - leftX) * 0.45;
            const path = `M ${leftX} ${height / 2}
              C ${leftX + curve} ${height / 2},
                ${rightX - curve} ${y},
                ${rightX} ${y}`;
            const color = colors[index % colors.length];
            const tooltip = `${spoke.label} · ${spoke.value} queries`;
            return (
              <g key={spoke.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={thickness + 16}
                  strokeLinecap="round"
                  pointerEvents="stroke"
                >
                  <title>{tooltip}</title>
                </path>
                <rect
                  x={rightX - 18}
                  y={y - nodeHeight / 2}
                  width="36"
                  height={nodeHeight}
                  rx="10"
                  fill={color}
                  opacity="0.2"
                />
                <circle cx={rightX} cy={y} r="5" fill={color} />
                <text
                  x={rightX + 28}
                  y={y}
                  textAnchor="start"
                  fontSize="12"
                  fill="#1f3b7a"
                  stroke="#ffffff"
                  strokeWidth="3"
                  paintOrder="stroke"
                  dominantBaseline="middle"
                >
                  {spoke.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
