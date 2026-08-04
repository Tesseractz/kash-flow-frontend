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
  StatCard,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton, SkeletonText } from "../components/ui/Skeleton";
import {
  Banknote,
  TrendingUp,
  Receipt,
  Scale,
  Package,
  AlertTriangle,
  BarChart3,
  Clock,
  Calendar,
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
  const H = 220;
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
      <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
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
          className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          title={`${p.name} — ${p.total_sold} sold · ${fmtR(p.total_revenue)} revenue${p.total_profit != null ? ` · ${fmtR(p.total_profit)} profit` : ""}`}
        >
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
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
      <div className="flex items-end gap-[3px] h-32">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Title + controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {advanced ? "Advanced insights for your business" : "Daily sales performance"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAdvanced && (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
              aria-label="Analytics period"
            >
              {PERIODS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5" title="Daily snapshot and CSV export use this date">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
              aria-label="Snapshot date"
            />
          </div>
          <Button
            variant={canExport ? "secondary" : "ghost"}
            size="sm"
            onClick={handleExport}
            disabled={exporting || !isOnline}
          >
            {canExport ? <Download size={15} /> : <Lock size={15} />}
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCashUp(true)}>
            <Calculator size={15} />
            End of day
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reportQuery.refetch();
              if (canViewAdvanced) analyticsQuery.refetch();
              lowStockQuery.refetch();
            }}
            disabled={!isOnline}
          >
            <RefreshCw size={15} className={reportQuery.isFetching || analyticsQuery.isFetching ? "animate-spin" : ""} />
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

      {/* KPI tiles */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-5">
                <SkeletonText lines={2} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title={kpis.revenueLabel}
            value={fmtR(kpis.revenue)}
            icon={Banknote}
            accent="brand"
            trend={advanced && kpis.trend ? `${Math.abs(kpis.trend)}% vs first half` : undefined}
            trendUp={kpis.trend > 0}
          />
          <StatCard
            title="Profit"
            value={fmtR(kpis.profit)}
            icon={TrendingUp}
            accent="accent"
            trend={`${(kpis.margin || 0).toFixed(1)}% margin`}
            trendUp={kpis.profit >= 0}
          />
          <StatCard title="Sales" value={(kpis.sales || 0).toLocaleString("en-ZA")} icon={Receipt} accent="warm" />
          <StatCard title="Avg transaction" value={fmtR(kpis.avg)} icon={Scale} accent="neutral" />
        </div>
      )}

      {/* Revenue trend (advanced) */}
      {canViewAdvanced && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Revenue trend</CardTitle>
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
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : (
              <RevenueTrendChart trends={a?.sales_trends || []} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top products + hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top products</CardTitle>
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
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <CardTitle className="text-base">Busy hours</CardTitle>
            </div>
            <CardDescription>{advanced ? "Revenue by hour of day" : `Hourly activity on ${fmtDay(date)}`}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : (
              <HourlyChart hours={advanced ? a?.hourly_breakdown || [] : basic.hourly} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">
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
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UsersIcon size={15} className="text-slate-400" />
              <CardTitle className="text-base">Staff performance</CardTitle>
            </div>
            <CardDescription>Net revenue by team member · last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {staffStats.map((m) => {
                const max = Math.max(...staffStats.map((x) => x.revenue), 1);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <CardTitle className="text-base">Low stock</CardTitle>
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
