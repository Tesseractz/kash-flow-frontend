import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShiftsAPI, TimeClockAPI, CommissionsAPI, UsersAPI } from '../api/client'
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
  Clock,
  Calendar,
  Users,
  DollarSign,
  Play,
  Square,
  CheckCircle,
  XCircle,
  BarChart3,
  Timer,
  Briefcase,
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

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (hours) => {
  if (!hours) return '-'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

export default function Employees() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('time-clock')
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const [shiftFormData, setShiftFormData] = useState({
    user_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    scheduled_start: '09:00',
    scheduled_end: '17:00',
    notes: '',
  })

  // Queries
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: UsersAPI.list,
  })
  const users = Array.isArray(usersData) ? usersData : []

  const { data: clockStatusData } = useQuery({
    queryKey: ['clock-status'],
    queryFn: TimeClockAPI.getCurrentStatus,
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: timeEntriesData, isLoading: loadingTimeEntries } = useQuery({
    queryKey: ['time-clock', dateRange],
    queryFn: () => TimeClockAPI.list({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  })
  const timeEntries = Array.isArray(timeEntriesData) ? timeEntriesData : []

  const { data: shiftsData, isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts', dateRange],
    queryFn: () => ShiftsAPI.list({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  })
  const shifts = Array.isArray(shiftsData) ? shiftsData : []

  const { data: commissionsData, isLoading: loadingCommissions } = useQuery({
    queryKey: ['commissions', dateRange],
    queryFn: () => CommissionsAPI.list({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  })
  const commissions = Array.isArray(commissionsData) ? commissionsData : []

  // Mutations
  const clockInMutation = useMutation({
    mutationFn: TimeClockAPI.clockIn,
    onSuccess: () => {
      queryClient.invalidateQueries(['clock-status'])
      queryClient.invalidateQueries(['time-clock'])
      toast.success('Clocked in successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to clock in')
    },
  })

  const clockOutMutation = useMutation({
    mutationFn: TimeClockAPI.clockOut,
    onSuccess: () => {
      queryClient.invalidateQueries(['clock-status'])
      queryClient.invalidateQueries(['time-clock'])
      toast.success('Clocked out successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to clock out')
    },
  })

  const createShiftMutation = useMutation({
    mutationFn: ShiftsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      toast.success('Shift created!')
      resetShiftForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create shift')
    },
  })

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => ShiftsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      toast.success('Shift updated!')
      resetShiftForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update shift')
    },
  })

  const deleteShiftMutation = useMutation({
    mutationFn: ShiftsAPI.remove,
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      toast.success('Shift deleted!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete shift')
    },
  })

  const approveCommissionMutation = useMutation({
    mutationFn: CommissionsAPI.approve,
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions'])
      toast.success('Commission approved!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve commission')
    },
  })

  const payCommissionMutation = useMutation({
    mutationFn: CommissionsAPI.markPaid,
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions'])
      toast.success('Commission marked as paid!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to mark commission as paid')
    },
  })

  const resetShiftForm = () => {
    setShiftFormData({
      user_id: '',
      shift_date: new Date().toISOString().split('T')[0],
      scheduled_start: '09:00',
      scheduled_end: '17:00',
      notes: '',
    })
    setEditingShift(null)
    setIsShiftDialogOpen(false)
  }

  const handleShiftSubmit = (e) => {
    e.preventDefault()
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data: shiftFormData })
    } else {
      createShiftMutation.mutate(shiftFormData)
    }
  }

  const handleEditShift = (shift) => {
    setEditingShift(shift)
    setShiftFormData({
      user_id: shift.user_id,
      shift_date: shift.shift_date,
      scheduled_start: shift.scheduled_start || '09:00',
      scheduled_end: shift.scheduled_end || '17:00',
      notes: shift.notes || '',
    })
    setIsShiftDialogOpen(true)
  }

  const handleDeleteShift = (shift) => {
    if (window.confirm('Delete this shift?')) {
      deleteShiftMutation.mutate(shift.id)
    }
  }

  // Summary calculations
  const summary = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0)
    const totalOvertime = timeEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0)
    const pendingCommissions = commissions.filter((c) => c.status === 'pending')
    const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0)
    const totalPaidAmount = commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0)

    return {
      totalHours,
      totalOvertime,
      pendingCommissions: pendingCommissions.length,
      totalPendingAmount,
      totalPaidAmount,
      activeShifts: shifts.filter((s) => s.status === 'in_progress').length,
    }
  }, [timeEntries, commissions, shifts])

  const isClockedIn = clockStatusData?.clocked_in

  const tabs = [
    { id: 'time-clock', label: 'Time Clock', icon: Clock },
    { id: 'shifts', label: 'Shifts', icon: Calendar },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Time tracking, shifts, and commissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isClockedIn ? (
            <Button
              onClick={() => clockInMutation.mutate({})}
              disabled={clockInMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Clock In
            </Button>
          ) : (
            <Button
              onClick={() => clockOutMutation.mutate({})}
              disabled={clockOutMutation.isPending}
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Clock Out
            </Button>
          )}
        </div>
      </div>

      {/* Clock Status Banner */}
      {isClockedIn && clockStatusData?.entry && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-500 rounded-full animate-pulse flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    You are currently clocked in
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Started at {formatTime(clockStatusData.entry.clock_in)}
                  </p>
                </div>
              </div>
              <Timer className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hours Worked</p>
                <p className="text-xl font-bold">{formatDuration(summary.totalHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overtime</p>
                <p className="text-xl font-bold">{formatDuration(summary.totalOvertime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Commission</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalPendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid Commission</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalPaidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full min-w-0 sm:w-40">
              <label className="block text-sm font-medium mb-1">From</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="w-full min-w-0 sm:w-40">
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

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'time-clock' && (
        <Card>
          <CardHeader>
            <CardTitle>Time Clock Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTimeEntries ? (
              <div className="text-center py-8">Loading...</div>
            ) : timeEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No time entries recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Clock In</th>
                      <th className="text-left py-3 px-4">Clock Out</th>
                      <th className="text-right py-3 px-4">Hours</th>
                      <th className="text-right py-3 px-4">Overtime</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map((entry) => (
                      <tr key={entry.id} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">{entry.user_name || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div>{formatDate(entry.clock_in)}</div>
                            <div className="text-xs text-gray-500">{formatTime(entry.clock_in)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {entry.clock_out ? (
                            <div>
                              <div>{formatDate(entry.clock_out)}</div>
                              <div className="text-xs text-gray-500">{formatTime(entry.clock_out)}</div>
                            </div>
                          ) : (
                            <span className="text-green-500 font-medium">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatDuration(entry.total_hours)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-orange-600">
                          {entry.overtime_hours > 0 ? formatDuration(entry.overtime_hours) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {entry.approved_by ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              Approved
                            </span>
                          ) : entry.clock_out ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                              Pending
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              In Progress
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'shifts' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Shift Schedule</CardTitle>
            <Button onClick={() => setIsShiftDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </CardHeader>
          <CardContent>
            {loadingShifts ? (
              <div className="text-center py-8">Loading...</div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No shifts scheduled</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Scheduled</th>
                      <th className="text-left py-3 px-4">Actual</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">{shift.user_name || 'Unknown'}</td>
                        <td className="py-3 px-4">{formatDate(shift.shift_date)}</td>
                        <td className="py-3 px-4">
                          {shift.scheduled_start} - {shift.scheduled_end}
                        </td>
                        <td className="py-3 px-4">
                          {shift.actual_start ? (
                            <>
                              {formatTime(shift.actual_start)} -{' '}
                              {shift.actual_end ? formatTime(shift.actual_end) : 'Active'}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              shift.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : shift.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : shift.status === 'missed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {shift.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditShift(shift)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteShift(shift)}
                              className="text-red-500"
                            >
                              Delete
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
      )}

      {activeTab === 'commissions' && (
        <Card>
          <CardHeader>
            <CardTitle>Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCommissions ? (
              <div className="text-center py-8">Loading...</div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No commissions recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-right py-3 px-4">Sale Amount</th>
                      <th className="text-right py-3 px-4">Rate</th>
                      <th className="text-right py-3 px-4">Commission</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">{comm.user_name || 'Unknown'}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(comm.sale_amount)}
                        </td>
                        <td className="py-3 px-4 text-right">{comm.commission_rate}%</td>
                        <td className="py-3 px-4 text-right font-mono text-green-600">
                          {formatCurrency(comm.commission_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              comm.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : comm.status === 'approved'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {comm.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {comm.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveCommissionMutation.mutate(comm.id)}
                                className="text-blue-500"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {comm.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => payCommissionMutation.mutate(comm.id)}
                                className="text-green-500"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            )}
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
      )}

      {activeTab === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Performance dashboards coming soon</p>
              <p className="text-sm mt-2">
                View employee sales reports in the Reports section
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShiftSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee *</label>
              <select
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                value={shiftFormData.user_id}
                onChange={(e) =>
                  setShiftFormData((prev) => ({ ...prev, user_id: e.target.value }))
                }
                required
              >
                <option value="">Select employee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <Input
                type="date"
                value={shiftFormData.shift_date}
                onChange={(e) =>
                  setShiftFormData((prev) => ({ ...prev, shift_date: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <Input
                  type="time"
                  value={shiftFormData.scheduled_start}
                  onChange={(e) =>
                    setShiftFormData((prev) => ({ ...prev, scheduled_start: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <Input
                  type="time"
                  value={shiftFormData.scheduled_end}
                  onChange={(e) =>
                    setShiftFormData((prev) => ({ ...prev, scheduled_end: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                placeholder="Additional notes..."
                value={shiftFormData.notes}
                onChange={(e) =>
                  setShiftFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetShiftForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
              >
                {editingShift ? 'Update' : 'Create'} Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
