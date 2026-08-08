import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnalyticsAPI, AlertsAPI, ReportsAPI, PlanAPI, SalesAPI, UsersAPI } from "../api/client";
import CashUpDialog from "../components/CashUpDialog";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadFromStorage, saveToStorage } from "../lib/offlineStorage";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton, SkeletonText } from "../components/ui/Skeleton";
import {
  Package,
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Lock,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Calculator,
  Users as UsersIcon,
} from "lucide-react";
import toast from "react-hot-toast";

// Chart mark colors validated with the dataviz palette checker:
// light surface → brand-600 (#2563eb), dark surface → brand-500 (#3b82f6).
// All charts here are single-series, so identity never relies on color.

const REPORT_CACHE_KEY = "kashpoint_reports_cache_v3";

const PERIODS = [7, 14, 30, 60, 90];

const fmtR = (n) =>
  "R " + (Number(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRCompact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R${(v / 1_000).toFixed(1)}k`;
  return `R${Math.round(v)}`;
};

const fmtDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Round a max value up to a "nice" axis ceiling (1/2/2.5/5 × 10^k). */
function niceMax(value) {
  if (!value || value <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (value <= m * pow) return m * pow;
  }
  return 10 * pow;
}

// ---------------------------------------------------------------------------
// Revenue trend — single-series line + soft area, crosshair tooltip on hover,
// selective direct label on the peak day, data table for accessibility.
// ---------------------------------------------------------------------------
function RevenueTrendChart({ trends }) {
  const [hover, setHover] = useState(null); // index into trends
  const W = 640;
  const H = 170;
  const PAD = { l: 46, r: 12, t: 16, b: 26 };

  const { points, yMax, peakIdx, hasData } = useMemo(() => {
    const revs = trends.map((t) => Number(t.revenue) || 0);
    const max = Math.max(0, ...revs);
    const yMax = niceMax(max);
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const n = trends.length;
    const points = trends.map((t, i) => ({
      x: PAD.l + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2),
      y: PAD.t + innerH - ((Number(t.revenue) || 0) / yMax) * innerH,
    }));
    let peakIdx = -1;
    if (max > 0) peakIdx = revs.indexOf(max);
    return { points, yMax, peakIdx, hasData: max > 0 };
  }, [trends]);

  if (!trends.length || !hasData) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No sales in this period yet.
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H - PAD.b} L${points[0].x.toFixed(1)},${H - PAD.b} Z`;
  const gridYs = [0.25, 0.5, 0.75, 1].map((f) => PAD.t + (H - PAD.t - PAD.b) * (1 - f));
  const xLabelIdxs = trends.length > 2 ? [0, Math.floor((trends.length - 1) / 2), trends.length - 1] : trends.map((_, i) => i);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const x = frac * W;
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const h = hover != null ? trends[hover] : null;
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="Daily revenue for the selected period"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {gridYs.map((y, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="stroke-slate-200/70 dark:stroke-slate-800" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[10px] tabular-nums">
              {fmtRCompact(yMax * [0.25, 0.5, 0.75, 1][i])}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />

        {xLabelIdxs.map((i) => (
          <text key={i} x={points[i].x} y={H - 8} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[10px]">
            {fmtDay(trends[i].date)}
          </text>
        ))}

        <path d={areaPath} className="fill-brand-600/10 dark:fill-brand-500/15" />
        <path d={linePath} fill="none" className="stroke-brand-600 dark:stroke-brand-500" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {peakIdx >= 0 && hover == null && (
          <g>
            <circle cx={points[peakIdx].x} cy={points[peakIdx].y} r="4" className="fill-brand-600 dark:fill-brand-500 stroke-white dark:stroke-slate-900" strokeWidth="2" />
            <text
              x={points[peakIdx].x}
              y={Math.max(11, points[peakIdx].y - 10)}
              textAnchor={peakIdx > trends.length * 0.75 ? "end" : "middle"}
              className="fill-slate-600 dark:fill-slate-300 text-[10px] font-semibold tabular-nums"
            >
              {fmtRCompact(trends[peakIdx].revenue)}
            </text>
          </g>
        )}

        {hp && (
          <g>
            <line x1={hp.x} x2={hp.x} y1={PAD.t} y2={H - PAD.b} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.x} cy={hp.y} r="4.5" className="fill-brand-600 dark:fill-brand-500 stroke-white dark:stroke-slate-900" strokeWidth="2" />
          </g>
        )}
      </svg>

      {h && hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-slate-900/95 dark:bg-slate-700/95 px-2.5 py-1.5 text-[11px] text-white shadow-soft-lg whitespace-nowrap"
          style={{ left: `${(hp.x / W) * 100}%`, top: `${Math.max(0, (hp.y / H) * 100 - 22)}%` }}
        >
          <span className="font-semibold">{fmtDay(h.date)}</span> · {fmtR(h.revenue)} ·{" "}
          {h.sales_count} sale{h.sales_count === 1 ? "" : "s"}
        </div>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
          View data table
        </summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-left">
              <tr>
                <th className="px-3 py-1.5 font-semibold text-slate-500 dark:text-slate-400">Date</th>
                <th className="px-3 py-1.5 font-semibold text-slate-500 dark:text-slate-400 text-right">Sales</th>
                <th className="px-3 py-1.5 font-semibold text-slate-500 dark:text-slate-400 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr key={t.date} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{fmtDay(t.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{t.sales_count}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmtR(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top products — horizontal magnitude bars, single hue, hover row.
// ---------------------------------------------------------------------------
function TopProducts({ products }) {
  if (!products.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No product sales in this period.</p>;
  }
  const max = Math.max(...products.map((p) => Number(p.total_revenue) || 0), 1);
  return (
    <div className="space-y-0.5">
      {products.slice(0, 6).map((p) => (
        <div
          key={p.product_id}
          className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          title={`${p.name} — ${p.total_sold} sold · ${fmtR(p.total_revenue)} revenue${p.total_profit != null ? ` · ${fmtR(p.total_profit)} profit` : ""}`}
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <Package className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white flex-shrink-0">
                {fmtRCompact(p.total_revenue)}
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-600 dark:bg-brand-500 transition-all"
                  style={{ width: `${Math.max(2, ((Number(p.total_revenue) || 0) / max) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">
                {p.total_sold} sold{p.total_profit != null ? ` · ${fmtRCompact(p.total_profit)} profit` : ""}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hourly activity — 24 slim bars, rounded data-ends at the top, CSS tooltips.
// ---------------------------------------------------------------------------
function HourlyChart({ hours }) {
  const byHour = useMemo(() => {
    const map = new Array(24).fill(null).map((_, h) => ({ hour: h, sales_count: 0, revenue: 0 }));
    for (const row of hours) {
      if (row.hour >= 0 && row.hour < 24) map[row.hour] = row;
    }
    return map;
  }, [hours]);

  const max = Math.max(...byHour.map((h) => Number(h.revenue) || 0));
  if (max <= 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No hourly data yet.</p>;
  }
  const peakHour = byHour.reduce((a, b) => (b.revenue > a.revenue ? b : a), byHour[0]);

  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {byHour.map((h) => {
          const pct = max > 0 ? ((Number(h.revenue) || 0) / max) * 100 : 0;
          const isPeak = h.hour === peakHour.hour && h.revenue > 0;
          return (
            <div key={h.hour} className="group relative flex-1 h-full flex flex-col justify-end">
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 rounded-lg bg-slate-900/95 dark:bg-slate-700/95 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-soft-lg">
                {String(h.hour).padStart(2, "0")}:00 · {fmtR(h.revenue)} · {h.sales_count} sale{h.sales_count === 1 ? "" : "s"}
              </div>
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  h.revenue > 0
                    ? "bg-brand-600 dark:bg-brand-500 group-hover:bg-brand-700 dark:group-hover:bg-brand-400"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
                style={{ height: h.revenue > 0 ? `${Math.max(4, pct)}%` : "3px" }}
                aria-label={`${String(h.hour).padStart(2, "0")}:00 — ${fmtR(h.revenue)}`}
              />
              {isPeak && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  {fmtRCompact(h.revenue)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric strip — one dense row instead of six chunky cards. Values are set at
// a readable-but-restrained size with tabular figures so the column of digits
// lines up, and each carries its own change-vs-previous-period chip.
// ---------------------------------------------------------------------------

function DeltaChip({ pct, invert = false }) {
  if (pct == null || !Number.isFinite(pct)) {
    return <span className="text-[11px] text-slate-400 dark:text-slate-600">no prior data</span>;
  }
  const flat = Math.abs(pct) < 0.05;
  // For most metrics up is good; for returns it is the opposite.
  const good = invert ? pct < 0 : pct > 0;
  const tone = flat
    ? "text-slate-500 dark:text-slate-400"
    : good
    ? "text-accent-700 dark:text-accent-400"
    : "text-rose-600 dark:text-rose-400";
  const arrow = flat ? "→" : pct > 0 ? "↑" : "↓";
  return (
    <span className={`text-[11px] font-medium tabular-nums ${tone}`} title="vs the previous period of equal length">
      {arrow} {Math.abs(pct).toFixed(pct >= 100 ? 0 : 1)}%
    </span>
  );
}

function Metric({ label, value, sub, delta, invert, accent = false }) {
  return (
    <div className="px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 truncate">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums leading-none truncate ${
          accent ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5 min-h-[15px]">
        {delta !== undefined ? <DeltaChip pct={delta} invert={invert} /> : null}
        {sub && <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{sub}</span>}
      </div>
    </div>
  );
}

function MetricStrip({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
}

/** A single line of plain-language analysis under the metric strip. */
function InsightRow({ items }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-slate-500 dark:text-slate-400">
      {shown.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          {t}
        </span>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const isOnline = useOnlineStatus();
  const [days, setDays] = useState(30);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [showCashUp, setShowCashUp] = useState(false);
  const [cache, setCache] = useState(() => loadFromStorage(REPORT_CACHE_KEY, { reports: {}, analytics: {} }));

  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => PlanAPI.get(),
    staleTime: 60000,
    enabled: isOnline,
  });
  const canExport = !!planQuery.data?.limits?.csv_export;
  const canViewAdvanced = !!planQuery.data?.limits?.advanced_reports;
  const planKnown = planQuery.isSuccess && !!planQuery.data;

  const analyticsQuery = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => AnalyticsAPI.get(days),
    staleTime: 60000,
    enabled: isOnline && canViewAdvanced,
    retry: (count, err) => err?.response?.status !== 402 && count < 2,
  });

  const reportQuery = useQuery({
    queryKey: ["reports", date],
    queryFn: () => ReportsAPI.get(date),
    staleTime: 30000,
    enabled: isOnline,
  });

  const lowStockQuery = useQuery({
    queryKey: ["low-stock-dash"],
    queryFn: () => AlertsAPI.getLowStock(10),
    staleTime: 120000,
    retry: false,
    enabled: isOnline,
  });

  // Staff performance (raw sales grouped by seller, client-side)
  const allSalesQuery = useQuery({
    queryKey: ["all-sales"],
    queryFn: () => SalesAPI.list(),
    staleTime: 60000,
    enabled: isOnline,
  });
  const teamQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => UsersAPI.list(),
    staleTime: 300000,
    retry: false,
    enabled: isOnline,
  });

  const staffStats = useMemo(() => {
    const rows = allSalesQuery.data;
    if (!Array.isArray(rows)) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const nameOf = new Map(
      (Array.isArray(teamQuery.data) ? teamQuery.data : []).map((u) => [u.id, u.name || u.email || "Team member"])
    );
    const bySeller = new Map();
    for (const s of rows) {
      const t = new Date(s.timestamp);
      if (Number.isNaN(t.getTime()) || t < cutoff) continue;
      const key = s.sold_by || "unknown";
      const prev = bySeller.get(key) || { id: key, name: nameOf.get(key) || "Unassigned", revenue: 0, count: 0 };
      prev.revenue += Number(s.total_price) || 0;
      if ((Number(s.total_price) || 0) >= 0) prev.count += 1;
      bySeller.set(key, prev);
    }
    return Array.from(bySeller.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [allSalesQuery.data, teamQuery.data, days]);

  // Offline cache: keep last good analytics + daily reports around.
  useEffect(() => {
    if (reportQuery.data || analyticsQuery.data) {
      setCache((prev) => {
        const next = { reports: { ...prev.reports }, analytics: { ...prev.analytics } };
        if (reportQuery.data) next.reports[date] = reportQuery.data;
        if (analyticsQuery.data) next.analytics[days] = analyticsQuery.data;
        saveToStorage(REPORT_CACHE_KEY, next);
        return next;
      });
    }
  }, [reportQuery.data, analyticsQuery.data, date, days]);

  const a = analyticsQuery.data || cache.analytics?.[days];
  const report = reportQuery.data || cache.reports?.[date];
  const usingCache = (!analyticsQuery.data && !!cache.analytics?.[days]) || (!reportQuery.data && !!cache.reports?.[date]);
  const dailyTotals = report?.totals || {};
  const dailyTransactions = report?.transactions || [];

  // Free-plan fallback: build charts from the selected day's transactions.
  const basic = useMemo(() => {
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, sales_count: 0, revenue: 0 }));
    const byProduct = new Map();
    for (const t of dailyTransactions) {
      const ts = t.timestamp ? new Date(t.timestamp) : null;
      if (ts && !Number.isNaN(ts.getTime())) {
        const h = ts.getHours();
        hourly[h].sales_count += 1;
        hourly[h].revenue += Number(t.total_price || 0) || 0;
      }
      const name = t.product_name || `Product #${t.product_id}`;
      const key = String(t.product_id ?? name);
      const prev = byProduct.get(key) || {
        product_id: key,
        name,
        image_url: t.product_image_url || null,
        total_sold: 0,
        total_revenue: 0,
        total_profit: null,
      };
      prev.total_revenue += Number(t.total_price || 0) || 0;
      prev.total_sold += Number(t.quantity_sold || 0) || 0;
      byProduct.set(key, prev);
    }
    const topProducts = Array.from(byProduct.values()).sort((x, y) => y.total_revenue - x.total_revenue);
    return { hourly, topProducts };
  }, [dailyTransactions]);

  // Period-over-period comparison, computed from the sales rows already
  // fetched for staff performance. The analytics endpoint only reports
  // "first half vs second half" of the window, which answers a different
  // question than "how are we doing against last month".
  const periodStats = useMemo(() => {
    const rows = allSalesQuery.data;
    if (!Array.isArray(rows)) return null;
    const now = new Date();
    const curFrom = new Date(now);
    curFrom.setDate(curFrom.getDate() - days);
    const prevFrom = new Date(now);
    prevFrom.setDate(prevFrom.getDate() - days * 2);

    const blank = () => ({ revenue: 0, profit: 0, sales: 0, returns: 0, items: 0 });
    const cur = blank();
    const prev = blank();

    for (const s of rows) {
      const t = new Date(s.timestamp);
      if (Number.isNaN(t.getTime())) continue;
      const bucket = t >= curFrom ? cur : t >= prevFrom ? prev : null;
      if (!bucket) continue;
      const total = Number(s.total_price) || 0;
      const qty = Number(s.quantity_sold) || 0;
      bucket.revenue += total;
      if (s.profit != null) bucket.profit += Number(s.profit) || 0;
      if (total < 0 || qty < 0) bucket.returns += 1;
      else {
        bucket.sales += 1;
        bucket.items += qty;
      }
    }
    return { cur, prev };
  }, [allSalesQuery.data, days]);

  /** Percentage change vs the previous period; null when there is no baseline. */
  const delta = (current, previous) => {
    if (previous == null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const pc = periodStats;
  const avgOf = (b) => (b && b.sales > 0 ? b.revenue / b.sales : 0);

  const advanced = canViewAdvanced && !!a;

  const kpis = advanced
    ? {
        revenueLabel: `Revenue (${days}d)`,
        revenue: a.total_revenue,
        profit: a.total_profit,
        margin: a.profit_margin,
        sales: a.total_sales,
        avg: a.avg_transaction_value,
        trend: a.revenue_trend,
      }
    : {
        revenueLabel: "Today's revenue",
        revenue: dailyTotals.total_revenue || 0,
        profit: dailyTotals.total_profit || 0,
        margin: dailyTotals.total_revenue > 0 ? ((dailyTotals.total_profit || 0) / dailyTotals.total_revenue) * 100 : 0,
        sales: dailyTotals.total_sales_count || 0,
        avg: dailyTotals.total_sales_count > 0 ? (dailyTotals.total_revenue || 0) / dailyTotals.total_sales_count : 0,
        trend: 0,
      };

  const isLoading = (advanced ? analyticsQuery.isLoading : reportQuery.isLoading) && !usingCache;

  // A short line of plain-language findings. Each one states something the
  // numbers above imply but do not say outright, so the reader is not left to
  // work it out from the charts.
  const insights = useMemo(() => {
    const out = [];
    const hours = advanced ? a?.hourly_breakdown || [] : basic.hourly;
    const peak = hours.reduce((best, h) => ((h?.revenue || 0) > (best?.revenue || 0) ? h : best), null);
    if (peak && peak.revenue > 0) {
      out.push(`Busiest hour ${String(peak.hour).padStart(2, "0")}:00–${String((peak.hour + 1) % 24).padStart(2, "0")}:00 (${fmtRCompact(peak.revenue)})`);
    }
    if (advanced && a?.best_day) {
      out.push(`Best day ${fmtDay(a.best_day)} · ${fmtRCompact(a.best_day_revenue)}`);
    }
    const top = (advanced ? a?.top_products : basic.topProducts) || [];
    if (top.length && top[0]?.total_revenue > 0) {
      const share = kpis.revenue > 0 ? (top[0].total_revenue / kpis.revenue) * 100 : 0;
      out.push(
        `${top[0].name} leads${share > 0 ? ` with ${share.toFixed(0)}% of revenue` : ""}`
      );
    }
    if (pc && pc.cur.sales > 0 && pc.cur.items > 0) {
      out.push(`${(pc.cur.items / pc.cur.sales).toFixed(1)} items per sale`);
    }
    return out;
  }, [advanced, a, basic, kpis.revenue, pc]);

  const handleExport = async () => {
    if (!isOnline) return toast.error("You are offline. Connect to export reports.");
    if (!canExport) return toast.error("CSV export requires Pro or Business plan");
    try {
      setExporting(true);
      const blob = await ReportsAPI.exportCSV(date);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales_report_${date}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success("Report exported");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar — one compact row; the page title carries the period so the
          reader always knows what the numbers below describe. */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Dashboard</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {advanced ? `last ${days} days vs previous ${days}` : "daily performance"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canViewAdvanced && (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand-500"
              aria-label="Analytics period"
            >
              {PERIODS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand-500"
            aria-label="Snapshot date"
            title="Daily snapshot and CSV export use this date"
          />
          <Button
            variant={canExport ? "secondary" : "ghost"}
            size="xs"
            onClick={handleExport}
            disabled={exporting || !isOnline}
          >
            {canExport ? <Download size={13} /> : <Lock size={13} />}
            {exporting ? "Exporting…" : "Export"}
          </Button>
          <Button variant="primary" size="xs" onClick={() => setShowCashUp(true)}>
            <Calculator size={13} />
            End of day
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              reportQuery.refetch();
              if (canViewAdvanced) analyticsQuery.refetch();
              lowStockQuery.refetch();
              allSalesQuery.refetch();
            }}
            disabled={!isOnline}
            title="Refresh"
          >
            <RefreshCw size={13} className={reportQuery.isFetching || analyticsQuery.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Offline / cached notice */}
      {(!isOnline || usingCache) && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle size={16} />
            {isOnline ? "Showing cached data while fresh numbers load." : "You're offline. Showing cached data."}
          </CardContent>
        </Card>
      )}

      {/* Upgrade banner for free plans */}
      {planKnown && !canViewAdvanced && (
        <Card className="border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/30">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5" />
                <div>
                  <p className="font-medium text-brand-800 dark:text-brand-200">Unlock advanced analytics</p>
                  <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5">
                    Multi-day revenue trends, top products and busy-hours insights with Pro.
                  </p>
                </div>
              </div>
              <Link to="/billing">
                <Button variant="primary" size="sm">Upgrade</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      {isLoading ? (
        <Card>
          <CardContent className="py-4">
            <SkeletonText lines={2} />
          </CardContent>
        </Card>
      ) : (
        <>
          <MetricStrip>
            <Metric
              label={advanced ? `Revenue · ${days}d` : "Revenue today"}
              value={fmtR(kpis.revenue)}
              delta={pc ? delta(pc.cur.revenue, pc.prev.revenue) : undefined}
              accent
            />
            <Metric
              label="Gross profit"
              value={fmtR(kpis.profit)}
              sub={`${(kpis.margin || 0).toFixed(1)}% margin`}
              delta={pc ? delta(pc.cur.profit, pc.prev.profit) : undefined}
            />
            <Metric
              label="Sales"
              value={(kpis.sales || 0).toLocaleString("en-ZA")}
              delta={pc ? delta(pc.cur.sales, pc.prev.sales) : undefined}
            />
            <Metric
              label="Avg sale"
              value={fmtR(kpis.avg)}
              delta={pc ? delta(avgOf(pc.cur), avgOf(pc.prev)) : undefined}
            />
            <Metric
              label="Items sold"
              value={pc ? pc.cur.items.toLocaleString("en-ZA") : "—"}
              delta={pc ? delta(pc.cur.items, pc.prev.items) : undefined}
            />
            <Metric
              label="Returns"
              value={pc ? pc.cur.returns.toLocaleString("en-ZA") : "—"}
              sub={pc && pc.cur.sales > 0 ? `${((pc.cur.returns / pc.cur.sales) * 100).toFixed(1)}% of sales` : ""}
              delta={pc ? delta(pc.cur.returns, pc.prev.returns) : undefined}
              invert
            />
          </MetricStrip>
          <InsightRow items={insights} />
        </>
      )}

      {/* Revenue trend (advanced) */}
      {canViewAdvanced && (
        <Card>
          <CardHeader className="pb-1.5 px-4 pt-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-sm">Revenue trend</CardTitle>
                <CardDescription>Daily revenue over the selected period</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {a?.best_day && (
                  <Badge tone="brand" size="sm">
                    Best: {fmtDay(a.best_day)} · {fmtRCompact(a.best_day_revenue)}
                  </Badge>
                )}
                {a?.worst_day && a.worst_day !== a.best_day && (
                  <Badge tone="neutral" size="sm">
                    Worst: {fmtDay(a.worst_day)} · {fmtRCompact(a.worst_day_revenue)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsQuery.isLoading && !a ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (
              <RevenueTrendChart trends={a?.sales_trends || []} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top products + hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1.5 px-4 pt-3">
            <CardTitle className="text-sm">Top products</CardTitle>
            <CardDescription>{advanced ? "By revenue in the period" : `For ${fmtDay(date)}`}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonText lines={5} />
            ) : (
              <TopProducts products={advanced ? a?.top_products || [] : basic.topProducts} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 px-4 pt-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <CardTitle className="text-sm">Busy hours</CardTitle>
            </div>
            <CardDescription>{advanced ? "Revenue by hour of day" : `Hourly activity on ${fmtDay(date)}`}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-3">
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <HourlyChart hours={advanced ? a?.hourly_breakdown || [] : basic.hourly} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily snapshot */}
      <Card>
        <CardHeader className="pb-1.5 px-4 pt-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-sm">
                Snapshot · {new Date(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
              </CardTitle>
              <CardDescription>Totals for the selected date — exports use this date too</CardDescription>
            </div>
            <Link
              to={`/transactions?date=${date}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              <ShoppingBag size={15} />
              View transactions →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {reportQuery.isLoading && !report ? (
            <SkeletonText lines={2} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand" size="md">{dailyTotals.total_sales_count || 0} transactions</Badge>
              <Badge tone="success" size="md">Revenue {fmtR(dailyTotals.total_revenue)}</Badge>
              <Badge tone="info" size="md">Profit {fmtR(dailyTotals.total_profit)}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff performance */}
      {staffStats.length > 0 && (
        <Card>
          <CardHeader className="pb-1.5 px-4 pt-3">
            <div className="flex items-center gap-2">
              <UsersIcon size={15} className="text-slate-400" />
              <CardTitle className="text-sm">Staff performance</CardTitle>
            </div>
            <CardDescription>Net revenue by team member · last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {staffStats.map((m) => {
                const max = Math.max(...staffStats.map((x) => x.revenue), 1);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-accent-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white flex-shrink-0">{fmtR(m.revenue)}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-600 dark:bg-brand-500 transition-all"
                            style={{ width: `${Math.max(2, (m.revenue / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">
                          {m.count} sale{m.count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low stock */}
      <Card>
        <CardHeader className="pb-1.5 px-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <CardTitle className="text-sm">Low stock</CardTitle>
            </div>
            <Link to="/products" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              Manage products →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {lowStockQuery.isLoading ? (
            <SkeletonText lines={2} />
          ) : !Array.isArray(lowStockQuery.data) || lowStockQuery.data.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
              All stocked up — nothing at or below 10 units. 🎉
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lowStockQuery.data.slice(0, 12).map((p) => (
                <Badge key={p.id} tone={p.quantity === 0 ? "danger" : "warning"} size="md" icon={Package}>
                  {p.name} · {p.quantity === 0 ? "out" : `${p.quantity} left`}
                </Badge>
              ))}
              {lowStockQuery.data.length > 12 && (
                <Badge tone="neutral" size="md">+{lowStockQuery.data.length - 12} more</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* End-of-day cash-up */}
      {showCashUp && <CashUpDialog date={date} onClose={() => setShowCashUp(false)} />}
    </div>
  );
}
