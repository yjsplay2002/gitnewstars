"use client";

// Intelligence-vs-price scatter (artificialanalysis.ai style):
// x = blended price (3:1 input:output) on a log scale, y = SWE-bench %.
// Upper-left quadrant = best value.
import type { Dict } from "@/lib/i18n";

type Point = {
  id: string;
  name: string;
  priceIn: number;
  priceOut: number;
  swe: number;
  openWeight: boolean;
};

// Greedy label placement: for each point (drawn top-score first), try the
// candidate offsets in order and keep the first whose text box overlaps no
// dot and no already-placed label. Points that find no free slot get no
// label (tooltip still shows the name).
type Anchor = "start" | "middle" | "end";
const CANDIDATES: { dx: number; dy: number; anchor: Anchor }[] = [
  { dx: 0, dy: -13, anchor: "middle" },
  { dx: 11, dy: 4, anchor: "start" },
  { dx: -11, dy: 4, anchor: "end" },
  { dx: 0, dy: 21, anchor: "middle" },
  { dx: 9, dy: -9, anchor: "start" },
  { dx: -9, dy: -9, anchor: "end" },
  { dx: 9, dy: 16, anchor: "start" },
  { dx: -9, dy: 16, anchor: "end" },
];
const CHAR_W = 6.4; // approx label glyph width at 11.5px
const LABEL_H = 12;
const DOT_R = 7;

type Box = { x1: number; y1: number; x2: number; y2: number };

function labelBox(cx: number, cy: number, text: string, c: (typeof CANDIDATES)[number]): Box {
  const w = text.length * CHAR_W;
  const tx = cx + c.dx;
  const ty = cy + c.dy; // baseline
  const x1 = c.anchor === "start" ? tx : c.anchor === "end" ? tx - w : tx - w / 2;
  return { x1, y1: ty - LABEL_H + 2, x2: x1 + w, y2: ty + 2 };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

const W = 720;
const H = 420;
const M = { top: 30, right: 20, bottom: 50, left: 48 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const P_MIN = 0.25;
const P_MAX = 32;
const S_MIN = 65;
const S_MAX = 100;

const PRICE_TICKS = [0.5, 1, 2, 5, 10, 20];
const SCORE_TICKS = [65, 70, 75, 80, 85, 90, 95, 100];

function blended(p: Point): number {
  return (3 * p.priceIn + p.priceOut) / 4;
}
function x(price: number): number {
  const t = (Math.log10(price) - Math.log10(P_MIN)) / (Math.log10(P_MAX) - Math.log10(P_MIN));
  return M.left + t * IW;
}
function y(score: number): number {
  return M.top + ((S_MAX - score) / (S_MAX - S_MIN)) * IH;
}

export default function ModelScatter({ models, t }: { models: Point[]; t: Dict }) {
  // Quadrant split at the chart midpoints (AA convention), not medians.
  const midX = M.left + IW / 2;
  const midY = M.top + IH / 2;

  // Higher-score points get label priority (drawn first, claim space first).
  const ordered = [...models].sort((a, b) => b.swe - a.swe);
  const dotBoxes: Box[] = ordered.map((m) => {
    const cx = x(blended(m));
    const cy = y(m.swe);
    return { x1: cx - DOT_R, y1: cy - DOT_R, x2: cx + DOT_R, y2: cy + DOT_R };
  });
  const placedBoxes: Box[] = [];
  const chartArea: Box = { x1: M.left, y1: M.top, x2: M.left + IW, y2: M.top + IH };
  const labels = ordered.map((m) => {
    const cx = x(blended(m));
    const cy = y(m.swe);
    for (const c of CANDIDATES) {
      const box = labelBox(cx, cy, m.name, c);
      if (
        box.x1 >= chartArea.x1 &&
        box.x2 <= chartArea.x2 &&
        box.y1 >= chartArea.y1 &&
        box.y2 <= chartArea.y2 &&
        !placedBoxes.some((p) => overlaps(box, p)) &&
        !dotBoxes.some((d) => overlaps(box, d))
      ) {
        placedBoxes.push(box);
        return { m, cx, cy, pos: c };
      }
    }
    return { m, cx, cy, pos: null };
  });

  return (
    <figure className="model-chart">
      <figcaption className="model-chart__title">{t.chartTitle}</figcaption>
      <div className="model-chart__frame">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t.chartTitle}
          className="model-chart__svg"
        >
          {/* value zone: upper-left quadrant */}
          <rect
            x={M.left}
            y={M.top}
            width={midX - M.left}
            height={midY - M.top}
            fill="rgba(95, 126, 70, 0.07)"
          />
          <text x={M.left + 10} y={M.top + 18} className="chart-zone-label">
            ↖ {t.chartZone}
          </text>

          {/* grid */}
          {PRICE_TICKS.map((p) => (
            <line
              key={`gx${p}`}
              x1={x(p)}
              y1={M.top}
              x2={x(p)}
              y2={M.top + IH}
              className="chart-grid"
            />
          ))}
          {SCORE_TICKS.map((s) => (
            <line
              key={`gy${s}`}
              x1={M.left}
              y1={y(s)}
              x2={M.left + IW}
              y2={y(s)}
              className="chart-grid"
            />
          ))}

          {/* quadrant guides */}
          <line x1={midX} y1={M.top} x2={midX} y2={M.top + IH} className="chart-quad" />
          <line x1={M.left} y1={midY} x2={M.left + IW} y2={midY} className="chart-quad" />

          {/* axes */}
          <line
            x1={M.left}
            y1={M.top + IH}
            x2={M.left + IW}
            y2={M.top + IH}
            className="chart-axis"
          />
          <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + IH} className="chart-axis" />

          {/* tick labels */}
          {PRICE_TICKS.map((p) => (
            <text key={`tx${p}`} x={x(p)} y={M.top + IH + 18} className="chart-tick" textAnchor="middle">
              ${p}
            </text>
          ))}
          {SCORE_TICKS.map((s) => (
            <text key={`ty${s}`} x={M.left - 8} y={y(s) + 4} className="chart-tick" textAnchor="end">
              {s}
            </text>
          ))}

          {/* axis titles */}
          <text x={M.left + IW / 2} y={H - 8} className="chart-axis-title" textAnchor="middle">
            {t.chartX}
          </text>
          <text
            x={14}
            y={M.top + IH / 2}
            className="chart-axis-title"
            textAnchor="middle"
            transform={`rotate(-90 14 ${M.top + IH / 2})`}
          >
            {t.chartY}
          </text>

          {/* points + labels */}
          {labels.map(({ m, cx, cy, pos }) => {
            const price = blended(m);
            return (
              <g key={m.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={DOT_R}
                  className={m.openWeight ? "chart-dot chart-dot--open" : "chart-dot"}
                >
                  <title>{`${m.name} — SWE-bench ~${m.swe}% · $${price.toFixed(2)}/1M (blended)${m.openWeight ? ` · ${t.openWeightBadge}` : ""}`}</title>
                </circle>
                {pos && (
                  <text
                    x={cx + pos.dx}
                    y={cy + pos.dy}
                    className="chart-point-label"
                    textAnchor={pos.anchor}
                  >
                    {m.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* legend */}
          <g>
            <circle cx={M.left + IW - 150} cy={M.top + 14} r={6} className="chart-dot" />
            <text x={M.left + IW - 140} y={M.top + 18} className="chart-tick">
              API
            </text>
            <circle cx={M.left + IW - 100} cy={M.top + 14} r={6} className="chart-dot chart-dot--open" />
            <text x={M.left + IW - 90} y={M.top + 18} className="chart-tick">
              {t.openWeightBadge}
            </text>
          </g>
        </svg>
      </div>
      <p className="model-chart__hint">{t.chartHint}</p>
    </figure>
  );
}
