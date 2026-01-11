import { useQuery } from '@tanstack/react-query'
import { ReportsAPI, PlanAPI } from '../api/client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TrendingUp, DollarSign, ShoppingBag, Calendar, ArrowUp, Download, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Reports() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exporting, setExporting] = useState(false)

  const reportQuery = useQuery({
    queryKey: ['reports', date],
    queryFn: () => ReportsAPI.get(date),
    staleTime: 30000,
  })

  const planQuery = useQuery({
    queryKey: ['plan'],
    queryFn: () => PlanAPI.get(),
    staleTime: 60000,
  })

  const canExport = planQuery.data?.limits?.csv_export

  const handleExport = async () => {
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

  const totals = reportQuery.data?.totals || {}
  const transactions = reportQuery.data?.transactions || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Sales Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your daily sales performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              type="date"
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-full sm:w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select date"
            />
          </div>
          <Button
            variant={canExport ? 'secondary' : 'ghost'}
            onClick={handleExport}
            disabled={exporting || reportQuery.isLoading}
            className="flex items-center gap-2"
          >
            {canExport ? <Download size={16} /> : <Lock size={16} />}
            {exporting ? 'Exporting...' : 'Export CSV'}
            {!canExport && <span className="text-xs ml-1 text-amber-600 dark:text-amber-400">(Pro)</span>}
          </Button>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reportQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load report. Please try again.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                      R {(totals.total_revenue || 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400 text-sm">
                      <ArrowUp size={14} />
                      <span>Today's earnings</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Profit</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                      R {(totals.total_profit || 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 text-sm">
                      <TrendingUp size={14} />
                      <span>Net profit margin</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sales</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                      {totals.total_sales_count || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-purple-600 dark:text-purple-400 text-sm">
                      <ShoppingBag size={14} />
                      <span>Transactions</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <ShoppingBag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All sales for {new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No transactions found</p>
                  <p className="text-sm">No sales were recorded on this day</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transaction ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                              #{t.id}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200">Product #{t.product_id}</td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{t.quantity_sold}</td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">R {Number(t.total_price).toFixed(2)}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 dark:text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</td>
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
