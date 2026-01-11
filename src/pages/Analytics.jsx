import { useQuery } from '@tanstack/react-query'
import { AnalyticsAPI, PlanAPI } from '../api/client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Clock,
  Package,
  ArrowUp,
  ArrowDown,
  Lock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function Analytics() {
  const [days, setDays] = useState(30);

  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => PlanAPI.get(),
    staleTime: 60000,
  });

  // Use !! to convert truthy values to boolean
  const canView = !!planQuery.data?.limits?.advanced_reports;

  const analyticsQuery = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => AnalyticsAPI.get(days),
    staleTime: 30000, // Refresh more often
    enabled: canView, // Now properly boolean
    retry: 2,
  });

  if (planQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Advanced insights for your business
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Upgrade Required
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Advanced analytics require a Pro or Business plan.
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/billing")}
            >
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = analyticsQuery.data || {};
  const isLoading = analyticsQuery.isLoading;
  const isError = analyticsQuery.isError;
  const refetch = analyticsQuery.refetch;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Advanced insights for your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Period:
          </span>
          <select
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Failed to load analytics
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              There was an error loading your analytics data.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw size={16} />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : data.total_sales === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              No sales data yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Make some sales to see your analytics here. Data will appear after
              you complete transactions on the Sell page.
            </p>
            <Button onClick={() => (window.location.href = "/sell")}>
              Go to Sell Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R{" "}
                      {(data.total_revenue || 0).toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      {data.revenue_trend >= 0 ? (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <ArrowUp size={14} />
                          {Math.abs(data.revenue_trend || 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <ArrowDown size={14} />
                          {Math.abs(data.revenue_trend || 0).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-slate-400">vs prior period</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Total Profit
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R{" "}
                      {(data.total_profit || 0).toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 text-sm">
                      <TrendingUp size={14} />
                      <span>{data.profit_margin || 0}% margin</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Total Sales
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {data.total_sales || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-purple-600 dark:text-purple-400 text-sm">
                      <ShoppingBag size={14} />
                      <span>Transactions</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Avg Transaction
                    </p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      R {(data.avg_transaction_value || 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-amber-600 dark:text-amber-400 text-sm">
                      <BarChart3 size={14} />
                      <span>Per sale</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  Revenue Trend
                </CardTitle>
                <CardDescription>
                  Daily revenue over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(data.sales_trends || []).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No data available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <span>
                        Best: {data.best_day} (R{" "}
                        {data.best_day_revenue?.toFixed(2)})
                      </span>
                      <span>
                        Worst: {data.worst_day} (R{" "}
                        {data.worst_day_revenue?.toFixed(2)})
                      </span>
                    </div>
                    <div className="h-48 flex items-end gap-1 overflow-x-auto pb-2">
                      {(data.sales_trends || []).slice(-30).map((day, i) => {
                        const maxRevenue =
                          Math.max(
                            ...(data.sales_trends || []).map((d) => d.revenue)
                          ) || 1;
                        const height = (day.revenue / maxRevenue) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 min-w-[8px] group relative"
                          >
                            <div
                              className="bg-blue-500 dark:bg-blue-400 rounded-t hover:bg-blue-600 dark:hover:bg-blue-300 transition-colors"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {day.date}: R {day.revenue.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  Hourly Breakdown
                </CardTitle>
                <CardDescription>Sales activity by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                {(data.hourly_breakdown || []).every(
                  (h) => h.sales_count === 0
                ) ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No data available</p>
                  </div>
                ) : (
                  <div className="h-48 flex items-end gap-1">
                    {(data.hourly_breakdown || []).map((hour) => {
                      const maxCount =
                        Math.max(
                          ...(data.hourly_breakdown || []).map(
                            (h) => h.sales_count
                          )
                        ) || 1;
                      const height = (hour.sales_count / maxCount) * 100;
                      return (
                        <div key={hour.hour} className="flex-1 group relative">
                          <div
                            className="bg-purple-500 dark:bg-purple-400 rounded-t hover:bg-purple-600 dark:hover:bg-purple-300 transition-colors"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {hour.hour}:00 - {hour.sales_count} sales
                          </div>
                          {hour.hour % 6 === 0 && (
                            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
                              {hour.hour}:00
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} />
                Top Products
              </CardTitle>
              <CardDescription>
                Best performing products by revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(data.top_products || []).length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sales data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Units Sold
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.top_products || []).map((product, idx) => (
                        <tr
                          key={product.product_id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                  : idx === 1
                                  ? "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200"
                                  : idx === 2
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {product.name}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {product.sku || "-"}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            {product.total_sold}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            R {product.total_revenue.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                            R {product.total_profit.toFixed(2)}
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
  );
}
