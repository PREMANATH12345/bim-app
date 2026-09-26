import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Users,
  Globe2,
  ArrowUpRight,
  TrendingUp,
  PieChart,
  Search,
  X,
  BarChart3,
} from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AdminMobileNavBar from "./AdminMobileNavBar";

const API_URL = import.meta.env.VITE_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// One reusable "trending" stat card: gradient icon badge, big bold number,
// soft gradient backdrop, subtle hover lift.
const StatCard = ({ icon: Icon, label, value, loading, gradient, iconBg }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    {/* Decorative gradient blob */}
    <div
      className={`absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl ${gradient}`}
    />
    <div className="relative flex items-start justify-between">
      <div className={`p-2 sm:p-3 rounded-xl text-white shadow-lg ${iconBg}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <ArrowUpRight className="w-4 h-4 text-slate-300" />
    </div>
    <h3 className="relative text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-3 sm:mt-4">
      {label}
    </h3>
    <p className="relative text-xl sm:text-3xl font-bold text-slate-800 mt-1">
      {loading ? (
        <span className="inline-block h-6 sm:h-8 w-12 sm:w-16 bg-slate-100 rounded animate-pulse" />
      ) : (
        value.toLocaleString()
      )}
    </p>
  </div>
);

// Parses a video's `batch` field into a clean list of batch names — it may
// come back as a JSON-array string, a comma-separated string, or a plain
// array, depending on how it was saved.
const normalizeBatches = (batch) => {
  let values = batch;
  if (typeof batch === "string") {
    try {
      const parsed = JSON.parse(batch);
      values = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      values = batch.split(",");
    }
  }
  if (!Array.isArray(values)) values = [values];
  return values
    .map((b) => String(b ?? "").replace(/[\[\]"']/g, "").trim())
    .filter(Boolean);
};

// Gradient palette cycled through for pie slices / legend swatches - kept in
// sync between the SVG gradient defs and the legend dots below.
const PIE_COLORS = [
  ["#8b5cf6", "#6366f1"], // purple -> indigo
  ["#3b82f6", "#06b6d4"], // blue -> cyan
  ["#10b981", "#0d9488"], // emerald -> teal
  ["#f97316", "#ec4899"], // orange -> pink
  ["#f59e0b", "#ef4444"], // amber -> red
  ["#14b8a6", "#3b82f6"], // teal -> blue
  ["#a855f7", "#ec4899"], // violet -> pink
  ["#22c55e", "#84cc16"], // green -> lime
];

// Shared date-range filter, applied to both the trend chart and the pie
// chart so they always describe the same window.
const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "last15", label: "Last 15 Days" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

const RANGE_SUBLABELS = {
  today: "today",
  week: "this week",
  last15: "the last 15 days",
  month: "this month",
  year: "this year",
  custom: "the selected range",
};

// Segmented pill control shared by both charts.
const RangeSelector = ({ value, onChange }) => (
  <div className="inline-flex flex-nowrap gap-1 bg-slate-100 rounded-xl p-1 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
    {RANGE_OPTIONS.map((opt) => (
      <button
        key={opt.key}
        type="button"
        onClick={() => onChange(opt.key)}
        className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
          value === opt.key
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Builds a smooth ("catmull-rom to bezier") SVG path through a set of
// points, so the trend line reads as a soft curve instead of sharp angles.
const buildSmoothPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
};

// "Last 7 Days" trend card - smooth gradient line/area chart of how many
// distinct students watched a video each day, with the raw view count
// available on hover. Pure inline SVG (no charting library needed) so it
// scales cleanly from a phone-width column up to a wide desktop panel.
const WeeklyTrendChart = ({ data, loading, rangeLabel }) => {
  const [hovered, setHovered] = useState(null);

  const width = 700;
  const height = 220;
  const padTop = 24;
  const padBottom = 34;
  const padX = 12;
  const chartHeight = height - padTop - padBottom;

  const maxStudents = Math.max(1, ...data.map((d) => d.students));

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? width / 2
        : padX + (i / (data.length - 1)) * (width - padX * 2);
    const y = padTop + (1 - d.students / maxStudents) * chartHeight;
    return { x, y, ...d };
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${padTop + chartHeight} L ${points[0].x},${padTop + chartHeight} Z`
      : "";

  const active = hovered !== null ? points[hovered] : null;

  // With more than ~12 points (This Month, Last 15 Days, etc.) printing every
  // single date label crowds them into an unreadable strip, so only every
  // Nth label is shown — always including the very last point so the chart
  // still reads as "up to today".
  const labelStep = points.length > 20 ? 3 : points.length > 10 ? 2 : 1;
  const shouldShowLabel = (i) => i % labelStep === 0 || i === points.length - 1;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl text-white shadow-md bg-gradient-to-br from-indigo-500 to-purple-600">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Watch Activity
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Students who watched a video, {rangeLabel}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          Loading trend...
        </div>
      ) : data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No activity yet
        </div>
      ) : (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[220px]"
            preserveAspectRatio="none"
            onMouseLeave={() => setHovered(null)}
          >
            <defs>
              <linearGradient id="trend-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="trend-area" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {[0, 0.5, 1].map((t) => (
              <line
                key={t}
                x1={padX}
                x2={width - padX}
                y1={padTop + t * chartHeight}
                y2={padTop + t * chartHeight}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            ))}

            {/* Area fill under the curve */}
            <path d={areaPath} fill="url(#trend-area)" />

            {/* The trend line itself */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#trend-line)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Vertical guide + highlighted point on hover */}
            {active && (
              <line
                x1={active.x}
                x2={active.x}
                y1={padTop}
                y2={padTop + chartHeight}
                stroke="#c7d2fe"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}

            {points.map((p, i) => (
              <g key={p.date || i}>
                {/* Invisible wider hit-area so hovering is easy on small screens */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={16}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hovered === i ? 6 : 4}
                  fill="#ffffff"
                  stroke="#7c3aed"
                  strokeWidth={hovered === i ? 3 : 2}
                  className="transition-all duration-150"
                />
              </g>
            ))}

            {/* X-axis day labels */}
            {points.map((p, i) =>
              shouldShowLabel(i) ? (
                <text
                  key={`label-${p.date || i}`}
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#94a3b8"
                  fontWeight={hovered === i ? 700 : 500}
                >
                  {p.label}
                </text>
              ) : null
            )}
          </svg>

          {/* Floating tooltip for the hovered day */}
          {active && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-800 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap"
              style={{
                left: `${(active.x / width) * 100}%`,
                top: `${(active.y / height) * 100}%`,
                marginTop: -10,
              }}
            >
              <div className="font-semibold">{active.label}</div>
              <div className="text-slate-300">
                {active.students} student{active.students !== 1 ? "s" : ""} ·{" "}
                {active.views} view{active.views !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// "Courses" donut chart - built from concentric-circle stroke-dasharray
// segments (no charting library needed). Hovering (or tapping, on touch
// devices) any wedge pops a small tooltip with that batch's name and share.
const CoursePieChart = ({ segments, loading, rangeLabel }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const size = 220;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const hovered = hoveredIndex !== null ? segments[hoveredIndex] : null;
  const hoveredPct =
    hovered && total ? Math.round((hovered.count / total) * 100) : 0;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl text-white shadow-md bg-gradient-to-br from-orange-500 to-pink-500">
          <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Views by Course
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Share of total views per course/batch, {rangeLabel}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
          Loading courses...
        </div>
      ) : total === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
          No views yet
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Donut */}
          <div
            ref={containerRef}
            className="relative shrink-0 mx-auto sm:mx-0"
            style={{ width: size, height: size }}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {segments.map((s, i) => {
                const dash = (s.count / total) * circumference;
                const offset = -((cumulative / total) * circumference);
                cumulative += s.count;
                const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
                const gradId = `course-grad-${i}`;
                const isHovered = hoveredIndex === i;
                return (
                  <g key={s.batch}>
                    <defs>
                      <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={from} />
                        <stop offset="100%" stopColor={to} />
                      </linearGradient>
                    </defs>
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={`url(#${gradId})`}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={offset}
                      strokeLinecap="butt"
                      className="transition-all duration-200 cursor-pointer"
                      style={{ opacity: hoveredIndex === null || isHovered ? 1 : 0.45 }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onFocus={() => setHoveredIndex(i)}
                      tabIndex={0}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{total.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Views</span>
            </div>

            {/* Tooltip that follows the cursor, showing the hovered batch name */}
            {hovered && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-800 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap"
                style={{ left: tooltipPos.x, top: tooltipPos.y - 10 }}
              >
                <div className="font-semibold">{hovered.batch}</div>
                <div className="text-slate-300">
                  {hovered.count.toLocaleString()} view{hovered.count !== 1 ? "s" : ""} · {hoveredPct}%
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="w-full sm:flex-1 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
            {segments.map((s, i) => {
              const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
              const pct = total ? Math.round((s.count / total) * 100) : 0;
              return (
                <div
                  key={s.batch}
                  className="flex items-center gap-2 min-w-0 rounded-lg px-1 py-0.5 cursor-pointer transition-colors hover:bg-slate-50"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  />
                  <span className="text-xs sm:text-sm text-slate-600 truncate flex-1">
                    {s.batch}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// "Views by Course" as a column/bar chart — a separate visualization from
// the donut above, same underlying { batch, count } segments. Pure SVG/CSS,
// horizontally scrollable so it stays readable with many courses.
const CourseColumnChart = ({ segments, loading, rangeLabel }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const maxCount = Math.max(1, ...segments.map((s) => s.count));
  const barAreaHeight = 180;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl text-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Views by Course
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Total views per course/batch, {rangeLabel}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          Loading courses...
        </div>
      ) : segments.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No views yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="flex items-end gap-4 sm:gap-6 min-w-max px-1"
            style={{ height: `${barAreaHeight + 40}px` }}
          >
            {segments.map((s, i) => {
              const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
              const barHeight = Math.max((s.count / maxCount) * barAreaHeight, 4);
              const isHovered = hoveredIndex === i;
              return (
                <div
                  key={s.batch}
                  className="flex flex-col items-center justify-end shrink-0"
                  style={{ height: `${barAreaHeight + 40}px`, width: "56px" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span className="text-xs font-semibold text-slate-700 mb-1">
                    {s.count.toLocaleString()}
                  </span>
                  <div
                    className="w-8 sm:w-9 rounded-t-lg transition-all duration-200"
                    style={{
                      height: `${barHeight}px`,
                      background: `linear-gradient(180deg, ${from}, ${to})`,
                      opacity: hoveredIndex === null || isHovered ? 1 : 0.5,
                      boxShadow: isHovered ? `0 0 0 2px ${from}55` : "none",
                    }}
                  />
                  <span
                    className="text-[10px] sm:text-[11px] text-slate-500 mt-2 text-center leading-tight break-words"
                    style={{ maxWidth: "64px" }}
                    title={s.batch}
                  >
                    {s.batch}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Generic vertical column chart used by both "Top Videos by Views" and
// "Batch/Course Comparison" — takes { label, count }[] and draws simple
// gradient bars with the count above and a truncated label below.
const ColumnChart = ({ data, loading, emptyText, formatValue }) => {
  if (loading) {
    return (
      <div className="flex items-end gap-3 h-52 px-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 bg-slate-100 rounded-t-lg animate-pulse" style={{ height: `${40 + (i % 3) * 20}%` }} />
        ))}
      </div>
    );
  }
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-16 text-center">{emptyText}</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-3 sm:gap-4 h-56 min-w-max px-1">
        {data.map((d, i) => {
          const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
          const heightPct = Math.max((d.count / maxCount) * 100, 4);
          return (
            <div key={d.label} className="flex flex-col items-center justify-end h-full w-16 sm:w-20 shrink-0">
              <span className="text-xs sm:text-sm font-bold text-slate-700 mb-1">
                {formatValue ? formatValue(d.count) : d.count}
              </span>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{ height: `${heightPct}%`, background: `linear-gradient(180deg, ${from}, ${to})` }}
              />
              <span
                className="text-[10px] sm:text-xs text-slate-500 mt-2 text-center leading-tight line-clamp-2 w-full"
                title={d.label}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Horizontal bar chart — used for "Batch/Course Comparison" instead of
// ColumnChart, since batch names (e.g. "3A/2025", "17/2026 Weekend") read
// far better on a left-aligned label than squeezed under a vertical bar.
const HorizontalBarChart = ({ data, loading, emptyText, formatValue }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    );
  }
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-16 text-center">{emptyText}</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
        const widthPct = Math.max((d.count / maxCount) * 100, 3);
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span
              className="w-24 sm:w-32 shrink-0 text-xs sm:text-sm text-slate-600 truncate text-right"
              title={d.label}
            >
              {d.label}
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-6 sm:h-7 relative overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
              >
                <span className="text-[11px] sm:text-xs font-semibold text-white">
                  {formatValue ? formatValue(d.count) : d.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Ranked "leaderboard" bar chart — used for both "Top Videos by Views" and
// "Batch/Course Comparison" so the two cards share one consistent, more
// polished look: numbered rank badge, label + value on top, a slim
// gradient progress bar underneath. Fully responsive — no fixed widths,
// long labels truncate with a native tooltip on hover.
const RankedBarChart = ({ data, loading, emptyText, valueSuffix = "" }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${70 - i * 8}%` }} />
            <div className="h-2.5 bg-slate-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-16 text-center">{emptyText}</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-4 sm:space-y-5">
      {data.map((d, i) => {
        const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
        const pct = Math.max((d.count / maxCount) * 100, 3);
        return (
          <div key={d.label}>
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5">
              <span
                className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white text-[11px] sm:text-xs font-bold shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                {i + 1}
              </span>
              <span
                className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-700 truncate"
                title={d.label}
              >
                {d.label}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0 whitespace-nowrap">
                {d.count.toLocaleString()}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden ml-8 sm:ml-10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Donut chart + legend, with a hover tooltip that follows the cursor.
// Content-only (no outer card) so it drops into an existing card wrapper,
// same contract as RankedBarChart: data = [{ label, count }].
const DonutChart = ({ data, loading, emptyText, valueSuffix = "" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  if (loading) {
    return (
      <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (!data.length || total === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
        {emptyText}
      </div>
    );
  }

  const size = 220;
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const hovered = hoveredIndex !== null ? data[hoveredIndex] : null;
  const hoveredPct = hovered && total ? Math.round((hovered.count / total) * 100) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
      {/* Donut */}
      <div
        ref={containerRef}
        className="relative shrink-0 mx-auto sm:mx-0"
        style={{ width: size, height: size }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {data.map((d, i) => {
            const dash = (d.count / total) * circumference;
            const offset = -((cumulative / total) * circumference);
            cumulative += d.count;
            const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
            const gradId = `donut-grad-${d.label}-${i}`;
            const isHovered = hoveredIndex === i;
            return (
              <g key={d.label}>
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={from} />
                    <stop offset="100%" stopColor={to} />
                  </linearGradient>
                </defs>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  className="transition-all duration-200 cursor-pointer"
                  style={{ opacity: hoveredIndex === null || isHovered ? 1 : 0.45 }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onFocus={() => setHoveredIndex(i)}
                  tabIndex={0}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800">{total.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">
            {valueSuffix ? valueSuffix.trim() : "Total"}
          </span>
        </div>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-800 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 10 }}
          >
            <div className="font-semibold">{hovered.label}</div>
            <div className="text-slate-300">
              {hovered.count.toLocaleString()}
              {valueSuffix} · {hoveredPct}%
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="w-full sm:flex-1 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
        {data.map((d, i) => {
          const [from, to] = PIE_COLORS[i % PIE_COLORS.length];
          const pct = total ? Math.round((d.count / total) * 100) : 0;
          return (
            <div
              key={d.label}
              className="flex items-center gap-2 min-w-0 rounded-lg px-1 py-0.5 cursor-pointer transition-colors hover:bg-slate-50"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              />
              <span className="text-xs sm:text-sm text-slate-600 truncate flex-1">{d.label}</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminHomeDashboard = () => {
  const contentRef = useRef(null);
  const token = localStorage.getItem("token");

  const [totalCourses, setTotalCourses] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersList, setUsersList] = useState([]);
  const [totalWebsiteUsers, setTotalWebsiteUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  // Raw video list from the API (kept as-is; the "Views by Course" donut is
  // derived from this + the selected range via useMemo below, so switching
  // ranges doesn't need a re-fetch).
  const [videoList, setVideoList] = useState([]);
  // Trend chart - one entry per bucket (day, or month for "This Year") with
  // student + view counts. Re-fetched from the server whenever range changes,
  // since unique-student-per-day counts can't be derived client-side.
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  // "Views by Course" donut - raw { batch, views } rows from the server,
  // summed from the actual video_views table (views aren't tracked on the
  // video record itself). Re-fetched whenever range changes.
  const [batchViews, setBatchViews] = useState([]);
  const [batchViewsLoading, setBatchViewsLoading] = useState(true);

  // Shared date-range filter for the trend chart and the donut chart.
  const [range, setRange] = useState("today");
  const rangeLabel = RANGE_SUBLABELS[range];
  // Custom "date to date" range — only used when range === "custom".
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // "Search videos or course" box above the charts — narrows both the
  // trend chart and the donut to a single video or a single course/batch.
  const [chartSearch, setChartSearch] = useState("");
  const [chartSearchOpen, setChartSearchOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null); // { id, title }
  const [selectedCourse, setSelectedCourse] = useState(null); // batch name
  const chartSearchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chartSearchRef.current && !chartSearchRef.current.contains(e.target)) {
        setChartSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Course/batch options derived from the same video list already fetched
  // for the stat cards — no extra request needed.
  const courseOptions = useMemo(() => {
    const set = new Set();
    videoList.forEach((v) => normalizeBatches(v.batch).forEach((b) => set.add(b)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [videoList]);

  const searchResults = useMemo(() => {
    const q = chartSearch.trim().toLowerCase();
    if (!q) return { videos: [], courses: [] };
    return {
      videos: videoList.filter((v) => (v.title || "").toLowerCase().includes(q)).slice(0, 6),
      courses: courseOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 6),
    };
  }, [chartSearch, videoList, courseOptions]);

  // Only one filter is active at a time — picking a video clears the course
  // filter and vice versa.
  const pickVideo = (video) => {
    setSelectedVideo({ id: video.id, title: video.title });
    setSelectedCourse(null);
    setChartSearch(video.title);
    setChartSearchOpen(false);
  };
  const pickCourse = (course) => {
    setSelectedCourse(course);
    setSelectedVideo(null);
    setChartSearch(course);
    setChartSearchOpen(false);
  };
  const clearChartFilter = () => {
    setSelectedVideo(null);
    setSelectedCourse(null);
    setChartSearch("");
  };

  // Builds the query-string params shared by both chart fetches below —
  // the date range/custom dates, plus whichever video/course is selected.
  const buildChartParams = () => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (!customFrom || !customTo) return null; // wait for both dates
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    if (selectedVideo) params.set("videoId", selectedVideo.id);
    else if (selectedCourse) params.set("batch", selectedCourse);
    return params;
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [videosRes, usersRes, websiteUsersRes] = await Promise.allSettled([
          fetch(`${API_URL}/videos/getAllVideo`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API_BASE_URL
            ? fetch(`${API_BASE_URL}/users?page=1&limit=1`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);

        // Total Videos, and Total Courses — "courses" here means distinct
        // batches across all videos, same grouping used everywhere else in
        // the app (folders on the student side, batch picker on Users, etc).
        // These stat cards stay all-time; only the donut below is range-filtered.
        if (videosRes.status === "fulfilled" && videosRes.value?.ok) {
          const data = await videosRes.value.json();
          const list = Array.isArray(data.videos) ? data.videos : [];
          setVideoList(list);
          setTotalVideos(list.length);

          const batchSet = new Set();
          list.forEach((v) => normalizeBatches(v.batch).forEach((b) => batchSet.add(b)));
          setTotalCourses(batchSet.size);
        } else {
          setVideoList([]);
          setTotalVideos(0);
          setTotalCourses(0);
        }

        // Total Users (students + admins in this app)
        if (usersRes.status === "fulfilled" && usersRes.value?.ok) {
          const data = await usersRes.value.json();
          const list = Array.isArray(data) ? data : [];
          setUsersList(list);
          setTotalUsers(list.length);
        } else {
          setUsersList([]);
          setTotalUsers(0);
        }

        // Total Website Users (separate website/marketing backend)
        if (
          websiteUsersRes.status === "fulfilled" &&
          websiteUsersRes.value &&
          websiteUsersRes.value.ok
        ) {
          const data = await websiteUsersRes.value.json();
          setTotalWebsiteUsers(data.totalUsers || 0);
        } else {
          setTotalWebsiteUsers(0);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  // "Top Videos by Views" — fetched separately since it needs its own
  // top-N aggregation query; only depends on the date range (not on the
  // video/course search box, since narrowing to one video wouldn't leave
  // much of a "top videos" ranking to show).
  const [topVideos, setTopVideos] = useState([]);
  const [topVideosLoading, setTopVideosLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ range, limit: "8" });
    if (range === "custom") {
      if (!customFrom || !customTo) {
        setTopVideos([]);
        setTopVideosLoading(false);
        return;
      }
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    const fetchTopVideos = async () => {
      setTopVideosLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/videos/analytics/top-videos?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setTopVideos(Array.isArray(data.videos) ? data.videos : []);
        } else {
          setTopVideos([]);
        }
      } catch (error) {
        console.error("Error fetching top videos:", error);
        setTopVideos([]);
      } finally {
        setTopVideosLoading(false);
      }
    };
    fetchTopVideos();
  }, [range, customFrom, customTo, token]);

  // "Batch/Course Comparison" — how many users are enrolled in each batch.
  // This is a headcount, not watch activity, so it isn't date-filtered —
  // computed straight from the users list already fetched for the stat
  // cards above (a user counts toward every batch they belong to).
  const usersPerBatch = useMemo(() => {
    const counts = new Map();
    usersList.forEach((u) => {
      normalizeBatches(u.batch).forEach((b) => {
        counts.set(b, (counts.get(b) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count);
  }, [usersList]);

  // Re-fetch the trend chart whenever the selected range, custom dates, or
  // video/course filter changes. The backend accepts range (today | week |
  // last15 | month | year | custom), from/to (for custom), and an optional
  // videoId or batch, returning pre-bucketed { days: [...] } data.
  useEffect(() => {
    const params = buildChartParams();
    if (!params) {
      // Custom range picked but dates aren't both filled in yet.
      setWeeklyTrend([]);
      setWeeklyLoading(false);
      return;
    }
    const fetchTrend = async () => {
      setWeeklyLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/videos/analytics/watched?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setWeeklyTrend(Array.isArray(data.days) ? data.days : []);
        } else {
          setWeeklyTrend([]);
        }
      } catch (error) {
        console.error("Error fetching trend data:", error);
        setWeeklyTrend([]);
      } finally {
        setWeeklyLoading(false);
      }
    };

    fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo, selectedVideo, selectedCourse, token]);

  // Re-fetch actual per-batch view counts whenever range, custom dates, or
  // video/course filter changes. These come from video_views (joined to
  // videos for the batch name) since views aren't stored on the video
  // record itself.
  useEffect(() => {
    const params = buildChartParams();
    if (!params) {
      setBatchViews([]);
      setBatchViewsLoading(false);
      return;
    }
    const fetchViewsByBatch = async () => {
      setBatchViewsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/videos/analytics/views-by-batch?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setBatchViews(Array.isArray(data.segments) ? data.segments : []);
        } else {
          setBatchViews([]);
        }
      } catch (error) {
        console.error("Error fetching views by batch:", error);
        setBatchViews([]);
      } finally {
        setBatchViewsLoading(false);
      }
    };

    fetchViewsByBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo, selectedVideo, selectedCourse, token]);

  // "Views by Course" donut - each row from the server is one batch's raw
  // view count; normalizeBatches splits any row whose batch field actually
  // encodes more than one course, folding its views into each.
  const courseBreakdown = useMemo(() => {
    const viewsByBatch = new Map();

    batchViews.forEach(({ batch, views }) => {
      normalizeBatches(batch).forEach((b) => {
        viewsByBatch.set(b, (viewsByBatch.get(b) || 0) + (Number(views) || 0));
      });
    });

    return Array.from(viewsByBatch.entries())
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count);
  }, [batchViews]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div
          ref={contentRef}
          className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50 overflow-auto"
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-lg shadow-indigo-200">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            </div>
            <p className="text-slate-500">
              A quick overview of your courses, videos, and users
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <StatCard
              icon={BookOpen}
              label="Total Courses"
              value={totalCourses}
              loading={loading}
              gradient="bg-purple-500"
              iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
            />
            <StatCard
              icon={Video}
              label="Total Videos"
              value={totalVideos}
              loading={loading}
              gradient="bg-blue-500"
              iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
            <StatCard
              icon={Users}
              label="Total Users"
              value={totalUsers}
              loading={loading}
              gradient="bg-emerald-500"
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={Globe2}
              label="Total Website Users"
              value={totalWebsiteUsers}
              loading={loading}
              gradient="bg-orange-500"
              iconBg="bg-gradient-to-br from-orange-500 to-pink-500"
            />
          </div>

          {/* Date range filter — shared by both charts below */}
          <div className="flex items-center justify-between flex-wrap gap-3 mt-6 sm:mt-8">
            <h2 className="text-sm sm:text-base font-bold text-slate-700">
              Activity
            </h2>
            <RangeSelector value={range} onChange={setRange} />
          </div>

          {/* Custom "date to date" pickers — only shown when Custom Range is picked */}
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <label className="text-xs text-slate-500">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              />
              <label className="text-xs text-slate-500">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {/* Search videos or course — narrows both charts below to a single
              video (e.g. "Revit API with Python 3") or course/batch. */}
          <div className="relative mt-3" ref={chartSearchRef}>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chartSearch}
                onChange={(e) => {
                  setChartSearch(e.target.value);
                  setChartSearchOpen(true);
                  if (!e.target.value.trim()) clearChartFilter();
                }}
                onFocus={() => setChartSearchOpen(true)}
                placeholder="Search videos or course..."
                className="w-full sm:w-96 pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {(selectedVideo || selectedCourse) && (
                <button
                  type="button"
                  onClick={clearChartFilter}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {chartSearchOpen && chartSearch.trim() && (
              <div className="absolute z-20 mt-1 w-full sm:w-96 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.videos.length === 0 && searchResults.courses.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">No matches found.</p>
                ) : (
                  <>
                    {searchResults.courses.length > 0 && (
                      <div>
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Courses
                        </p>
                        {searchResults.courses.map((course) => (
                          <button
                            key={course}
                            type="button"
                            onClick={() => pickCourse(course)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          >
                            {course}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.videos.length > 0 && (
                      <div>
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Videos
                        </p>
                        {searchResults.videos.map((video) => (
                          <button
                            key={video.id}
                            type="button"
                            onClick={() => pickVideo(video)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          >
                            {video.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-3 sm:mt-4">
            <WeeklyTrendChart
              data={weeklyTrend}
              loading={weeklyLoading}
              rangeLabel={rangeLabel}
            />
            <CoursePieChart
              segments={courseBreakdown}
              loading={batchViewsLoading}
              rangeLabel={rangeLabel}
            />
          </div>

          {/* Top Videos by Views + Batch/Course Comparison — same chart style, side by side on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <Video className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-700">Top Videos by Views</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Most-watched videos, {rangeLabel}
              </p>
              <RankedBarChart
                data={topVideos.map((v) => ({ label: v.title, count: v.views }))}
                loading={topVideosLoading}
                emptyText="No video views in this date range."
                valueSuffix=" views"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-700">Batch/Course Comparison</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">Users enrolled per batch</p>
              <DonutChart
                data={usersPerBatch.map((b) => ({ label: b.batch, count: b.count }))}
                loading={loading}
                emptyText="No batches to compare yet."
                valueSuffix=" users"
              />
            </div>
          </div>
        </div>
      </div>

      <AdminMobileNavBar scrollContainerRef={contentRef} />
    </div>
  );
};

export default AdminHomeDashboard;