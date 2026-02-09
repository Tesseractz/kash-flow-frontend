import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DiscountsAPI, CategoriesAPI } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog'
import { 
  Plus, Edit2, Trash2, Percent, Tag, Calendar, 
  Clock, Users, ShoppingCart, Copy, Check, AlertCircle 
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Discounts() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase_amount: '',
    max_discount_amount: '',
    usage_limit: '',
    per_customer_limit: '1',
    applies_to: 'all',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  const { data: discountsData, isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => DiscountsAPI.list({ include_inactive: true, include_expired: true }),
  })
  const discounts = Array.isArray(discountsData) ? discountsData : []

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => CategoriesAPI.list(),
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  const createMutation = useMutation({
    mutationFn: DiscountsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['discounts'])
      toast.success('Discount created!')
      closeDialog()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create discount'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => DiscountsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['discounts'])
      toast.success('Discount updated!')
      closeDialog()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update discount'),
  })

  const deleteMutation = useMutation({
    mutationFn: DiscountsAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries(['discounts'])
      toast.success('Discount deleted!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete discount'),
  })

  const openDialog = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount)
      setFormData({
        name: discount.name,
        description: discount.description || '',
        code: discount.code || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value.toString(),
        min_purchase_amount: discount.min_purchase_amount?.toString() || '',
        max_discount_amount: discount.max_discount_amount?.toString() || '',
        usage_limit: discount.usage_limit?.toString() || '',
        per_customer_limit: discount.per_customer_limit?.toString() || '1',
        applies_to: discount.applies_to || 'all',
        start_date: discount.start_date ? discount.start_date.split('T')[0] : '',
        end_date: discount.end_date ? discount.end_date.split('T')[0] : '',
        is_active: discount.is_active,
      })
    } else {
      setEditingDiscount(null)
      setFormData({
        name: '',
        description: '',
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: '',
        max_discount_amount: '',
        usage_limit: '',
        per_customer_limit: '1',
        applies_to: 'all',
        start_date: '',
        end_date: '',
        is_active: true,
      })
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingDiscount(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Discount name is required')
      return
    }
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      toast.error('Discount value must be greater than 0')
      return
    }
    
    const data = {
      name: formData.name,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      applies_to: formData.applies_to,
      is_active: formData.is_active,
    }
    
    if (formData.description) data.description = formData.description
    if (formData.code) data.code = formData.code
    if (formData.min_purchase_amount) data.min_purchase_amount = parseFloat(formData.min_purchase_amount)
    if (formData.max_discount_amount) data.max_discount_amount = parseFloat(formData.max_discount_amount)
    if (formData.usage_limit) data.usage_limit = parseInt(formData.usage_limit)
    if (formData.per_customer_limit) data.per_customer_limit = parseInt(formData.per_customer_limit)
    if (formData.start_date) data.start_date = new Date(formData.start_date).toISOString()
    if (formData.end_date) data.end_date = new Date(formData.end_date).toISOString()
    
    if (editingDiscount) {
      updateMutation.mutate({ id: editingDiscount.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (discount) => {
    if (window.confirm(`Delete discount "${discount.name}"?`)) {
      deleteMutation.mutate(discount.id)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Code copied!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const getDiscountStatus = (discount) => {
    const now = new Date()
    if (!discount.is_active) return { label: 'Inactive', color: 'bg-gray-200 text-gray-700' }
    if (discount.end_date && new Date(discount.end_date) < now) return { label: 'Expired', color: 'bg-red-100 text-red-700' }
    if (discount.start_date && new Date(discount.start_date) > now) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' }
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) return { label: 'Limit Reached', color: 'bg-orange-100 text-orange-700' }
    return { label: 'Active', color: 'bg-green-100 text-green-700' }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts & Coupons</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage promotional discounts
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Discounts</p>
                <p className="text-xl font-bold">
                  {discounts.filter(d => getDiscountStatus(d).label === 'Active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Coupon Codes</p>
                <p className="text-xl font-bold">
                  {discounts.filter(d => d.code).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Uses</p>
                <p className="text-xl font-bold">
                  {discounts.reduce((sum, d) => sum + (d.usage_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts List */}
      {discounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Percent className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No discounts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create discounts to boost your sales
            </p>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Discount
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discounts.map((discount) => {
            const status = getDiscountStatus(discount)
            return (
              <Card key={discount.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${discount.discount_type === 'percentage' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                          {discount.discount_type === 'percentage' ? (
                            <Percent className={`w-5 h-5 ${discount.discount_type === 'percentage' ? 'text-indigo-600' : 'text-emerald-600'}`} />
                          ) : (
                            <Tag className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {discount.name}
                          </h3>
                          <p className="text-lg font-bold text-indigo-600">
                            {discount.discount_type === 'percentage' 
                              ? `${discount.discount_value}% off`
                              : `R${discount.discount_value.toFixed(2)} off`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {discount.description && (
                        <p className="text-sm text-gray-500 mb-2">{discount.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        
                        {discount.code && (
                          <button
                            onClick={() => copyCode(discount.code)}
                            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-sm hover:bg-gray-200 transition-colors"
                          >
                            {copiedCode === discount.code ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {discount.code}
                          </button>
                        )}
                        
                        {discount.min_purchase_amount > 0 && (
                          <span className="text-gray-500">
                            Min: R{discount.min_purchase_amount.toFixed(2)}
                          </span>
                        )}
                        
                        {discount.usage_limit && (
                          <span className="text-gray-500">
                            Uses: {discount.usage_count || 0}/{discount.usage_limit}
                          </span>
                        )}
                        
                        {(discount.start_date || discount.end_date) && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(discount.start_date)} - {formatDate(discount.end_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openDialog(discount)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(discount)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? 'Edit Discount' : 'Create Discount'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 20% Off"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (R)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Coupon Code</label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty for automatic discounts</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Purchase (R)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Discount (R)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Usage Limit</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Per Customer</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.per_customer_limit}
                  onChange={(e) => setFormData({ ...formData, per_customer_limit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm">Active</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingDiscount ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
