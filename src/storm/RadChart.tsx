// Mission ARES — a small line chart of REAL radiation on Mars (NASA RadLab, Curiosity's RAD, 19–22 May 2024).
// The line sits flat around 4 µGy/h, then jumps to 304 when the solar storm arrives on 20 May.

import { RADLAB, RADLAB_SERIES, RADLAB_TIMES } from "./radlab";

const W = 240;
const H = 104;
const PAD = { l: 30, r: 8, t: 14, b: 20 };
const HOURS = 60;
const MAX = 320;

const sx = (h: number) => PAD.l + (h / (HOURS - 1)) * (W - PAD.l - PAD.r);
const sy = (v: number) => PAD.t + (1 - v / MAX) * (H - PAD.t - PAD.b);

export default function RadChart() {
  const path = RADLAB_SERIES.map(([h, v], i) => `${i ? "L" : "M"}${sx(h).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const peak = RADLAB_SERIES.reduce((a, b) => (b[1] > a[1] ? b : a));
  const px = sx(peak[0]);
  const py = sy(peak[1]);
  const quietY = sy(RADLAB.quiet.rate);
  const area = `${path} L${sx(RADLAB_SERIES[RADLAB_SERIES.length - 1][0]).toFixed(1)},${sy(0)} L${sx(RADLAB_SERIES[0][0]).toFixed(1)},${sy(0)} Z`;
  return (
    <svg
      className="storm__chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Line chart of radiation on Mars from 19 to 22 May 2024. It stays near ${RADLAB.quiet.rate} microgray per hour, then jumps to ${RADLAB.storm.rate} on 20 May when the solar storm arrives, about ${RADLAB_TIMES} times higher, and slowly falls back.`}
    >
      {[0, 100, 200, 300].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} className="storm__grid" />
          <text x={PAD.l - 4} y={sy(v) + 3} textAnchor="end" className="storm__axis">
            {v}
          </text>
        </g>
      ))}
      {[12, 36].map((h) => (
        <line key={h} x1={sx(h)} x2={sx(h)} y1={PAD.t} y2={sy(0)} className="storm__grid is-day" />
      ))}
      <text x={sx(24)} y={H - 6} textAnchor="middle" className="storm__axis">
        20 May
      </text>
      <text x={sx(48)} y={H - 6} textAnchor="middle" className="storm__axis">
        21 May
      </text>
      <text x={sx(5)} y={H - 6} textAnchor="middle" className="storm__axis">
        19 May
      </text>
      <path d={area} className="storm__area" />
      <path d={path} className="storm__line" />
      <circle cx={px} cy={py} r="3.5" className="storm__peak" />
      <text x={px + 7} y={py + 4} className="storm__axis is-peak">
        {RADLAB.storm.rate}
      </text>
      <text x={sx(2)} y={quietY - 5} className="storm__axis is-quiet">
        quiet ≈ {RADLAB.quiet.rate}
      </text>
    </svg>
  );
}
