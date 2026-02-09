import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ExpensesAPI } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/Dialog'
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Receipt,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Upload,
  Filter,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value || 0)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Expenses() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    vendor: '',
    notes: '',
    is_recurring: false,
    recurring_frequency: '',
  })

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', dateRange, filterCategory],
    queryFn: () => ExpensesAPI.list({
      start_date: dateRange.start,
      end_date: dateRange.end,
      category: filterCategory || undefined,
    }),
  })
  const expenses = Array.isArray(expensesData) ? expensesData : []

  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => ExpensesAPI.getCategories(),
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  const createMutation = useMutation({
    mutationFn: ExpensesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
      toast.success('Expense recorded!')
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to record expense')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ExpensesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
      toast.success('Expense updated!')
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update expense')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ExpensesAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
      toast.success('Expense deleted!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete expense')
    },
  })

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      vendor: '',
      notes: '',
      is_recurring: false,
      recurring_frequency: '',
    })
    setEditingExpense(null)
    setIsDialogOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || 'cash',
      vendor: expense.vendor || '',
      notes: expense.notes || '',
      is_recurring: expense.is_recurring || false,
      recurring_frequency: expense.recurring_frequency || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (expense) => {
    if (window.confirm(`Delete expense "${expense.description || expense.category}"?`)) {
      deleteMutation.mutate(expense.id)
    }
  }

  // Summary calculations
  const summary = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const byCategory = {}
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    // Compare to previous period
    const daysInPeriod = Math.max(1, (new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24))
    const avgPerDay = total / daysInPeriod

    return { total, byCategory, topCategories, avgPerDay, count: expenses.length }
  }, [expenses, dateRange])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const query = searchQuery.toLowerCase()
    return expenses.filter(
      (e) =>
        e.category?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.vendor?.toLowerCase().includes(query)
    )
  }, [expenses, searchQuery])

  const paymentMethods = ['cash', 'card', 'bank_transfer', 'mobile_money', 'check', 'other']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and manage business expenses</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summary.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-xl font-bold">{summary.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
                <p className="text-xl font-bold">{formatCurrency(summary.avgPerDay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top Category</p>
                <p className="text-lg font-bold truncate">
                  {summary.topCategories[0]?.[0] || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium mb-1">From</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium mb-1">To</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No expenses recorded yet</p>
              <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Add First Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Vendor</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Payment</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">{formatDate(expense.expense_date)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">{expense.description || '-'}</td>
                      <td className="py-3 px-4">{expense.vendor || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4 capitalize">{expense.payment_method?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(expense)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {summary.topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topCategories.map(([category, amount]) => {
                const percentage = (amount / summary.total) * 100
                return (
                  <div key={category}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                placeholder="What was this expense for?"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expense_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  value={formData.payment_method}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vendor / Supplier</label>
              <Input
                placeholder="Who was paid?"
                value={formData.vendor}
                onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_recurring: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Recurring expense</span>
              </label>
              {formData.is_recurring && (
                <select
                  className="px-3 py-1 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={formData.recurring_frequency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, recurring_frequency: e.target.value }))}
                >
                  <option value="">Frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingExpense ? 'Update' : 'Save'} Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
