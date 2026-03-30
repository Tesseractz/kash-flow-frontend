import { useQuery } from '@tanstack/react-query'
import { ReportsAPI, AnalyticsAPI, PlanAPI } from '../api/client'
import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Calendar,
  ArrowUp,
  ArrowDown,
  Download,
  Lock,
  BarChart3,
  Clock,
  Package,
  RefreshCw,
  AlertCircle,
  ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadFromStorage, saveToStorage } from "../lib/offlineStorage";

const REPORT_CACHE_KEY = "kashpoint_reports_cache_v3";

export default function Reports() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [days, setDays] = useState(30)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'transactions'
  const isOnline = useOnlineStatus()
  const trendChartRef = useRef(null)
  const [cachedData, setCachedData] = useState(() =>
    loadFromStorage(REPORT_CACHE_KEY, { reports: {}, analytics: {} })
  )

  // Plan query
  const planQuery = useQuery({
    queryKey: ['plan'],
    queryFn: () => PlanAPI.get(),
    staleTime: 60000,
    enabled: isOnline,
  })

  const canExport = planQuery.data?.limits?.csv_export
  const canViewAdvanced = planQuery.data?.limits?.advanced_reports
  const planKnown = planQuery.isSuccess && !!planQuery.data
  const isFreePlan = planKnown ? !canViewAdvanced : false

  // Daily report query (for transactions)
  const reportQuery = useQuery({
    queryKey: ['reports', date],
    queryFn: () => ReportsAPI.get(date),
    staleTime: 30000,
    enabled: isOnline,
  })

  // Analytics query (for trends - only if paid)
  const analyticsQuery = useQuery({
    queryKey: ['analytics', days],
    queryFn: () => AnalyticsAPI.get(days),
    staleTime: 30000,
    enabled: canViewAdvanced && isOnline,
    retry: 2,
  })

  // Cache data
  useEffect(() => {
    if (reportQuery.data || analyticsQuery.data) {
      const next = { ...cachedData }
      if (reportQuery.data) next.reports[date] = reportQuery.data
      if (analyticsQuery.data) next.analytics[days] = analyticsQuery.data
      setCachedData(next)
      saveToStorage(REPORT_CACHE_KEY, next)
    }
  }, [reportQuery.data, analyticsQuery.data, date, days])

  // Auto-scroll trend chart to end
  useEffect(() => {
    if (trendChartRef.current && analyticsQuery.data?.sales_trends?.length > 0) {
      setTimeout(() => {
        trendChartRef.current?.scrollTo({ left: trendChartRef.current.scrollWidth, behavior: 'smooth' })
      }, 300)
    }
  }, [analyticsQuery.data?.sales_trends])

  const handleExport = async () => {
    if (!isOnline) {
      toast.error('You are offline. Connect to export reports.')
      return
    }
    if (!canExport) {
      toast.error('CSV export requires Pro or Business plan')
      return
    }
    try {
      setExporting(true)
      const blob = await ReportsAPI.exportCSV(date)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_report_${date}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Report exported successfully')
    } catch (e) {
      const message = e?.response?.data?.detail || 'Failed to export report'
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  // Data resolution
  const reportData = reportQuery.data || cachedData.reports?.[date]
  const analyticsData = analyticsQuery.data || cachedData.analytics?.[days]
  const usingCachedReport = !reportQuery.data && !!cachedData.reports?.[date]
  const usingCachedAnalytics = !analyticsQuery.data && !!cachedData.analytics?.[days]
  // If plan hasn't loaded yet, keep showing cached analytics (prevents "charts disappeared" flash)
  const allowAdvancedUI = !!canViewAdvanced || (!planKnown && usingCachedAnalytics)
  
  const totals = reportData?.totals || {}
  const transactions = reportData?.transactions || []

  const basicCharts = useMemo(() => {
    // Build simple "app-like" charts for free plan from daily transactions.
    // This ensures the Reports screen still has charts even without advanced analytics.
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sales_count: 0,
      revenue: 0,
    }))

    const byProduct = new Map()

    for (const t of transactions) {
      const ts = t.timestamp ? new Date(t.timestamp) : null
      const hour = ts && !Number.isNaN(ts.getTime()) ? ts.getHours() : null
      if (hour !== null) {
        hourly[hour].sales_count += Number(t.quantity_sold || 0) > 0 ? 1 : 1
        hourly[hour].revenue += Number(t.total_price || 0) || 0
      }

      const name = t.product_name || t.productName || `Product #${t.product_id}`
      const key = String(t.product_id ?? name)
      const prev = byProduct.get(key) || { key, name, revenue: 0, qty: 0, image_url: t.product_image_url || t.productImageUrl }
      prev.revenue += Number(t.total_price || 0) || 0
      prev.qty += Number(t.quantity_sold || 0) || 0
      if (!prev.image_url) prev.image_url = t.product_image_url || t.productImageUrl
      byProduct.set(key, prev)
    }

    const topProducts = Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const maxHourlySales = Math.max(...hourly.map((h) => h.sales_count), 1)
    const maxHourlyRevenue = Math.max(...hourly.map((h) => h.revenue), 1)

    return { hourly, topProducts, maxHourlySales, maxHourlyRevenue }
  }, [transactions])

  const hourColor = (revenue, maxRevenue) => {
    if (!maxRevenue || maxRevenue <= 0) return "bg-slate-300 dark:bg-slate-600"
    const r = Math.max(0, revenue) / maxRevenue
    // 6-step ramp: slate -> blue -> indigo -> violet -> fuchsia -> amber
    if (r < 0.05) return "bg-slate-300 dark:bg-slate-600"
    if (r < 0.2) return "bg-sky-500 dark:bg-sky-400"
    if (r < 0.4) return "bg-blue-600 dark:bg-blue-400"
    if (r < 0.6) return "bg-indigo-600 dark:bg-indigo-400"
    if (r < 0.8) return "bg-violet-600 dark:bg-violet-400"
    return "bg-amber-500 dark:bg-amber-400"
  }

  // For free users, show basic stats from daily report
  // For paid users, show analytics data
  const summaryData = allowAdvancedUI && analyticsData ? {
    total_revenue: analyticsData.total_revenue || 0,
    total_profit: analyticsData.total_profit || 0,
    total_sales: analyticsData.total_sales || 0,
    avg_transaction: analyticsData.avg_transaction_value || 0,
    revenue_trend: analyticsData.revenue_trend || 0,
    profit_margin: analyticsData.profit_margin || 0,
  } : {
    total_revenue: totals.total_revenue || 0,
    total_profit: totals.total_profit || 0,
    total_sales: totals.total_sales_count || 0,
    avg_transaction: totals.total_sales_count > 0 ? (totals.total_revenue || 0) / totals.total_sales_count : 0,
    revenue_trend: 0,
    profit_margin: totals.total_revenue > 0 ? ((totals.total_profit || 0) / totals.total_revenue * 100) : 0,
  }

  const isLoading =
    (reportQuery.isLoading && !usingCachedReport) ||
    (allowAdvancedUI && analyticsQuery.isLoading && !usingCachedAnalytics) ||
    (isOnline && planQuery.isLoading && !planKnown)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {planKnown && !canViewAdvanced
              ? 'Daily sales performance'
              : 'Advanced insights for your business'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Period selector (for analytics - paid only) */}
          {allowAdvancedUI && (
            <select
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          )}
          
          {/* Date picker: filters Transaction History and Export */}
          <div className="flex items-center gap-2" title="Transaction list and export use this date">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select date for transaction list and export"
            />
          </div>

          {/* Export button */}
          <Button
            variant={canExport ? 'secondary' : 'ghost'}
            onClick={handleExport}
            disabled={exporting || isLoading || !isOnline}
            size="sm"
            className="flex items-center gap-2"
          >
            {canExport ? <Download size={16} /> : <Lock size={16} />}
            {exporting ? 'Exporting...' : 'Export'}
            {!canExport && <span className="text-xs text-amber-600 dark:text-amber-400">(Pro)</span>}
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reportQuery.refetch()
              if (allowAdvancedUI) analyticsQuery.refetch()
            }}
            disabled={isLoading || !isOnline}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Offline/Cache notice */}
      {!isOnline && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle size={16} />
            You're offline. Showing cached data.
          </CardContent>
        </Card>
      )}

      {/* Upgrade banner for free users */}
      {planKnown && !canViewAdvanced && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Unlock Advanced Analytics
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                    Get revenue trends, hourly breakdowns, top products & more with Pro or Business.
                  </p>
                </div>
              </div>
              <Link to="/billing">
                <Button variant="primary" size="sm">
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      {allowAdvancedUI ? 'Total Revenue' : "Today's Revenue"}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R {summaryData.total_revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {allowAdvancedUI && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        {summaryData.revenue_trend >= 0 ? (
                          <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                            <ArrowUp size={14} />
                            {Math.abs(summaryData.revenue_trend).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 dark:text-red-400">
                            <ArrowDown size={14} />
                            {Math.abs(summaryData.revenue_trend).toFixed(1)}%
                          </span>
                        )}
                        <span className="text-slate-400 text-xs">vs prior</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      {allowAdvancedUI ? 'Total Profit' : "Today's Profit"}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R {summaryData.total_profit.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                      <TrendingUp size={14} />
                      <span>{summaryData.profit_margin.toFixed(1)}% margin</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      {allowAdvancedUI ? 'Total Sales' : "Today's Sales"}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {summaryData.total_sales}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
                      <ShoppingBag size={14} />
                      <span>Transactions</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      Avg Transaction
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R {summaryData.avg_transaction.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                      <BarChart3 size={14} />
                      <span>Per sale</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          {allowAdvancedUI && analyticsData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp size={18} />
                    Revenue Trend
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Daily revenue over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(analyticsData.sales_trends || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Best: {analyticsData.best_day} (R {analyticsData.best_day_revenue?.toFixed(2)})</span>
                        <span>Worst: {analyticsData.worst_day} (R {analyticsData.worst_day_revenue?.toFixed(2)})</span>
                      </div>
                      <div 
                        ref={trendChartRef}
                        className="h-40 flex items-stretch gap-1 overflow-x-auto pb-10"
                      >
                        {(() => {
                          const trends = analyticsData.sales_trends || []
                          const n = trends.length
                          const maxLabels = 4
                          const step = Math.max(1, Math.ceil(n / maxLabels))
                          const showLabel = (i) => i % step === 0 || i === n - 1
                          return trends.map((day, i) => {
                            const revenue = typeof day.revenue === 'number' ? day.revenue : parseFloat(day.revenue) || 0
                            const maxRevenue = Math.max(...trends.map(d => typeof d.revenue === 'number' ? d.revenue : parseFloat(d.revenue) || 0)) || 1
                            const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                            const barHeight = revenue > 0 ? Math.max(height, 15) : 2
                            const hasSales = revenue > 0
                            const labelVisible = showLabel(i)
                            return (
                              <div key={`${day.date}-${i}`} className="flex-1 min-w-[6px] h-full min-h-0 flex flex-col justify-end group relative">
                                <div
                                  className={`rounded-t transition-all flex-shrink-0 ${
                                    hasSales
                                      ? "bg-blue-500 dark:bg-blue-400 hover:bg-blue-600"
                                      : "bg-slate-200 dark:bg-slate-700 opacity-30"
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  {day.date}: R {revenue.toFixed(2)}
                                </div>
                                {labelVisible && (
                                  <span
                                    className={`absolute left-1/2 top-full mt-1.5 text-[9px] whitespace-nowrap ${hasSales ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-400'}`}
                                    style={{ transform: 'translateX(-50%) rotate(-45deg)', transformOrigin: 'top center' }}
                                  >
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hourly Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock size={18} />
                    Hourly Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sales activity by hour of day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(analyticsData.hourly_breakdown || []).every(h => h.sales_count === 0) ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  ) : (
                    <div className="h-40 flex items-stretch gap-1">
                      {(analyticsData.hourly_breakdown || []).map((hour) => {
                        const maxCount = Math.max(...(analyticsData.hourly_breakdown || []).map(h => h.sales_count)) || 1
                        const height = (hour.sales_count / maxCount) * 100
                        return (
                          <div key={hour.hour} className="flex-1 h-full min-h-0 flex flex-col justify-end group relative">
                            <div
                              className="bg-purple-500 dark:bg-purple-400 rounded-t hover:bg-purple-600 transition-colors flex-shrink-0"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {hour.hour}:00 - {hour.sales_count} sales
                            </div>
                            {hour.hour % 6 === 0 && (
                              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-400">
                                {hour.hour}:00
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic hourly chart for free plan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock size={18} />
                    Today by Hour
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sales count and revenue for the selected date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-36 flex items-stretch gap-1">
                        {basicCharts.hourly.map((h) => {
                          const height = (h.sales_count / basicCharts.maxHourlySales) * 100
                          const barColor = hourColor(h.revenue, basicCharts.maxHourlyRevenue)
                          return (
                            <div key={h.hour} className="flex-1 h-full min-h-0 flex flex-col justify-end group relative">
                              <div
                                className={`${barColor} rounded-t transition-colors flex-shrink-0`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                              />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {h.hour}:00 — {h.sales_count} sale{h.sales_count === 1 ? "" : "s"}, R {h.revenue.toFixed(2)}
                              </div>
                              {h.hour % 6 === 0 && (
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-400">
                                  {h.hour}:00
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Tip: upgrade for multi-day trends</span>
                        <span>Total: {transactions.length} sale{transactions.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Basic top products for free plan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package size={18} />
                    Top Products (Today)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Based on revenue for the selected date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {basicCharts.topProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {basicCharts.topProducts.map((p, idx) => (
                        <div
                          key={p.key}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {idx + 1}. {p.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {p.qty} item{p.qty === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              R {p.revenue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Products (Pro/Business only) */}
          {allowAdvancedUI && analyticsData && (analyticsData.top_products || []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package size={18} />
                  Top Products
                </CardTitle>
                <CardDescription className="text-xs">
                  Best performing products by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">#</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Product</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sold</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Revenue</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.top_products || []).slice(0, 5).map((product, idx) => (
                        <tr key={product.product_id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                              idx === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" :
                              idx === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200" :
                              idx === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" :
                              "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <span>{product.name}</span>
                                {product.sku && <span className="text-xs text-slate-400 ml-2">({product.sku})</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 text-sm">{product.total_sold}</td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 text-sm">R {product.total_revenue.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400 text-sm">R {product.total_profit.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag size={18} />
                Transaction History
              </CardTitle>
              <CardDescription className="text-xs">
                Sales for {new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-sm">No transactions on this date</p>
                  <p className="text-xs mt-1">No sales were recorded on the selected date above.</p>
                  {allowAdvancedUI && (
                    <p className="text-xs mt-2 text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                      Totals and charts above are for the selected period (Last {days} days), not just this date.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Product</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Qty</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Profit</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">#{t.id}</span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {(t.product_image_url || t.productImageUrl) ? (
                                  <img src={t.product_image_url || t.productImageUrl} alt={t.product_name || t.productName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <span>{t.product_name || t.productName || `Product #${t.product_id}`}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 text-sm">{t.quantity_sold}</td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 text-sm">
                            R {Number(t.total_price).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-sm">
                            <span className={`font-medium ${(t.profit || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                              R {Number(t.profit || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
