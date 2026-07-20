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

// Per-point label placement, tuned to avoid collisions.
// anchor: SVG text-anchor; dx/dy relative to the dot center.
const LABEL_POS: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  "gemini-3-1-pro": { dx: 0, dy: 22, anchor: "middle" },
  "claude-fable-5": { dx: -12, dy: 4, anchor: "end" },
};
const DEFAULT_POS = { dx: 0, dy: -14, anchor: "middle" as const };

const W = 720;
const H = 420;
const M = { top: 30, right: 20, bottom: 50, left: 48 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const P_MIN = 0.25;
const P_MAX = 32;
const S_MIN = 70;
const S_MAX = 100;

const PRICE_TICKS = [0.5, 1, 2, 5, 10, 20];
const SCORE_TICKS = [70, 75, 80, 85, 90, 95, 100];

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
          {models.map((m) => {
            const price = blended(m);
            const cx = x(price);
            const cy = y(m.swe);
            const pos = LABEL_POS[m.id] ?? DEFAULT_POS;
            return (
              <g key={m.id}>
                <circle cx={cx} cy={cy} r={7} className="chart-dot">
                  <title>{`${m.name} — SWE-bench ~${m.swe}% · $${price.toFixed(2)}/1M (blended)`}</title>
                </circle>
                <text
                  x={cx + pos.dx}
                  y={cy + pos.dy}
                  className="chart-point-label"
                  textAnchor={pos.anchor}
                >
                  {m.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="model-chart__hint">{t.chartHint}</p>
    </figure>
  );
}
