import React, { memo } from 'react'

function PieChartComponent({ data, size = 160, inner = 60 }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0)
  const r = size / 2
  let cum = 0
  const C = Math.PI * 2 * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>
      <g transform={`rotate(-90 ${r} ${r})`} filter="url(#softShadow)">
        {data.map((d, i) => {
          const val = d.value || 0
          const frac = total > 0 ? val / total : 0
          const dash = `${frac * C} ${C}`
          const el = (
            <circle key={i}
                    cx={r}
                    cy={r}
                    r={r - inner/2}
                    fill="transparent"
                    stroke={d.color || ['#60a5fa','#34d399','#f59e0b','#ef4444','#a78bfa','#f472b6','#22d3ee'][i % 7]}
                    strokeWidth={inner}
                    strokeDasharray={dash}
                    strokeDashoffset={-cum * C}
                    strokeLinecap="round"
            />
          )
          cum += frac
          return el
        })}
      </g>
      {inner > 0 && (
        <circle cx={r} cy={r} r={r - inner} fill={'var(--card)'} />
      )}
    </svg>
  )
}

const PieChart = memo(PieChartComponent)
export default PieChart