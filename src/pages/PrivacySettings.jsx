import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PrivacyAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/Dialog'
import {
  Shield,
  Download,
  Trash2,
  Monitor,
  Bell,
  Mail,
  BarChart3,
  Lock,
  LogOut,
  AlertTriangle,
  Check,
  X,
  Clock,
  Smartphone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import DevicePushSetup from '../components/DevicePushSetup'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PrivacySettings() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteMode, setDeleteMode] = useState('schedule') // 'schedule' | 'immediate'

  // Queries
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: PrivacyAPI.getSettings,
  })

  const { data: consentsData } = useQuery({
    queryKey: ['privacy-consents'],
    queryFn: PrivacyAPI.getConsents,
  })
  const consents = Array.isArray(consentsData) ? consentsData : []

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['privacy-sessions'],
    queryFn: PrivacyAPI.getSessions,
  })
  const sessions = Array.isArray(sessionsData) ? sessionsData : []

  const { data: exportRequestsData } = useQuery({
    queryKey: ['data-export-requests'],
    queryFn: PrivacyAPI.getDataExportRequests,
  })
  const exportRequests = Array.isArray(exportRequestsData) ? exportRequestsData : []

  const { data: deletionRequestsData } = useQuery({
    queryKey: ['account-deletion-requests'],
    queryFn: PrivacyAPI.getAccountDeletionRequests,
  })
  const deletionRequests = Array.isArray(deletionRequestsData) ? deletionRequestsData : []
  const pendingDeletion = deletionRequests.find(
    (r) => r.status === 'pending' || r.status === 'confirmed'
  )

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: PrivacyAPI.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['privacy-settings'])
      toast.success('Settings updated!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings')
    },
  })

  const updateConsentMutation = useMutation({
    mutationFn: PrivacyAPI.updateConsent,
    onSuccess: () => {
      queryClient.invalidateQueries(['privacy-consents'])
      toast.success('Consent updated!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update consent')
    },
  })

  const revokeSessionMutation = useMutation({
    mutationFn: PrivacyAPI.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries(['privacy-sessions'])
      toast.success('Session revoked!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to revoke session')
    },
  })

  const revokeAllSessionsMutation = useMutation({
    mutationFn: PrivacyAPI.revokeAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries(['privacy-sessions'])
      toast.success('All other sessions revoked!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to revoke sessions')
    },
  })

  const requestExportMutation = useMutation({
    mutationFn: PrivacyAPI.requestDataExport,
    onSuccess: () => {
      queryClient.invalidateQueries(['data-export-requests'])
      toast.success('Data export requested! You will receive an email when ready.')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to request export')
    },
  })

  const requestDeletionMutation = useMutation({
    mutationFn: PrivacyAPI.requestAccountDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries(['account-deletion-requests'])
      toast.success('Deletion request submitted. You have 30 days to cancel.')
      setDeleteDialogOpen(false)
      setDeleteReason('')
      setDeletePassword('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to request deletion')
    },
  })

  const cancelDeletionMutation = useMutation({
    mutationFn: PrivacyAPI.cancelAccountDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries(['account-deletion-requests'])
      toast.success('Deletion request cancelled.')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to cancel deletion')
    },
  })

  const executeDeletionMutation = useMutation({
    mutationFn: PrivacyAPI.executeAccountDeletion,
    onSuccess: async () => {
      toast.success('Account deleted.')
      try { await signOut() } catch (_) {}
      navigate('/auth', { replace: true })
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete account')
    },
  })

  const toggleSetting = (key) => {
    if (!settings) return
    updateSettingsMutation.mutate({
      [key]: !settings[key]
    })
  }

  const getConsentStatus = (type) => {
    const consent = consents.find(c => c.consent_type === type)
    return consent?.consented || false
  }

  const toggleConsent = (type, version = '1.0') => {
    const current = getConsentStatus(type)
    updateConsentMutation.mutate({
      consent_type: type,
      consented: !current,
      consent_version: version
    })
  }

  const handleDeleteRequest = () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm')
      return
    }
    const payload = {
      reason: deleteReason,
      confirm_password: deletePassword,
    }
    if (deleteMode === 'immediate') {
      if (!window.confirm('This will permanently delete your account and ALL data right now. Continue?')) {
        return
      }
      executeDeletionMutation.mutate(payload)
    } else {
      requestDeletionMutation.mutate(payload)
    }
  }

  const openDeleteDialog = (mode = 'schedule') => {
    setDeleteMode(mode)
    setDeleteDialogOpen(true)
  }

  const pendingExport = exportRequests.find(r => r.status === 'pending' || r.status === 'processing')

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full min-w-0 pb-24 lg:pb-0">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
          <Shield className="w-7 h-7 text-blue-600 flex-shrink-0" />
          <span className="break-words">Privacy & Security</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
          Manage your privacy preferences, data, and account security
        </p>
      </div>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Communication Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates about new features and offers</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-center">
              <input
                type="checkbox"
                checked={settings?.marketing_emails_enabled || false}
                onChange={() => toggleSetting('marketing_emails_enabled')}
                className="sr-only peer"
                disabled={loadingSettings}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Bell className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sync your preference with KashPoint. Use “System & device notifications” below to allow OS alerts.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-center">
              <input
                type="checkbox"
                checked={settings?.push_notifications_enabled || false}
                onChange={() => toggleSetting('push_notifications_enabled')}
                className="sr-only peer"
                disabled={loadingSettings}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <DevicePushSetup />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <BarChart3 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">Analytics & Improvements</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Help us improve by sharing usage data</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-center">
              <input
                type="checkbox"
                checked={settings?.data_analytics_enabled || false}
                onChange={() => toggleSetting('data_analytics_enabled')}
                className="sr-only peer"
                disabled={loadingSettings}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAllSessionsMutation.mutate()}
              disabled={revokeAllSessionsMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out all others
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <p className="text-gray-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-500">No active sessions found</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {session.device_info?.browser || 'Unknown Browser'}
                        {session.is_current && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.device_info?.os || 'Unknown OS'} • Last active {formatDate(session.last_active_at)}
                      </p>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Download Your Data</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Request a copy of all data we have about you. This includes your profile, 
              sales history, products, and all other account data.
            </p>
            <div className="mt-3">
              {pendingExport ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Export in progress... You'll receive an email when ready.</span>
                </div>
              ) : (
                <Button
                  onClick={() => requestExportMutation.mutate()}
                  disabled={requestExportMutation.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Request Data Export
                </Button>
              )}
            </div>
          </div>

          {/* Previous exports */}
          {exportRequests.filter(r => r.status === 'completed').length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Previous Exports</h4>
              <div className="space-y-2">
                {exportRequests.filter(r => r.status === 'completed').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm">{formatDate(request.completed_at)}</span>
                    {request.download_url && new Date(request.expires_at) > new Date() ? (
                      <a href={request.download_url} className="text-blue-600 text-sm hover:underline">
                        Download
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">Expired</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDeletion ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100">
                    Account scheduled for deletion
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Requested on {formatDate(pendingDeletion.requested_at)}.
                    {pendingDeletion.scheduled_deletion_at && (
                      <> Final deletion on <strong>{formatDate(pendingDeletion.scheduled_deletion_at)}</strong>.</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelDeletionMutation.mutate(pendingDeletion.id)}
                      disabled={cancelDeletionMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel deletion
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog('immediate')}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete immediately
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h4 className="font-medium text-red-900 dark:text-red-100">Delete Account</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
                You will have 30 days to cancel before final deletion.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="destructive"
                  onClick={() => openDeleteDialog('schedule')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openDeleteDialog('immediate')}
                >
                  Delete Immediately
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {deleteMode === 'immediate' ? 'Delete Account Immediately' : 'Delete Account'}
            </DialogTitle>
            <DialogDescription>
              {deleteMode === 'immediate'
                ? 'This will permanently delete your account and all data right now. There is no recovery.'
                : 'This will schedule your account for permanent deletion. You have 30 days to cancel.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {deleteMode !== 'immediate' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason for leaving (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                  placeholder="Help us improve by telling us why you're leaving..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Confirm Password *
              </label>
              <Input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>

            <div className={`p-3 rounded-lg text-sm ${
              deleteMode === 'immediate'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <p className={`font-medium ${
                deleteMode === 'immediate'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                What happens next:
              </p>
              <ul className={`mt-1 list-disc list-inside ${
                deleteMode === 'immediate'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {deleteMode === 'immediate' ? (
                  <>
                    <li>Your account, store, products, sales, and customers are removed immediately</li>
                    <li>You will be signed out and returned to the login page</li>
                    <li>This cannot be undone</li>
                  </>
                ) : (
                  <>
                    <li>Your account will be scheduled for deletion in 30 days</li>
                    <li>You can cancel anytime before that</li>
                    <li>After 30 days, all data will be permanently deleted</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              disabled={
                requestDeletionMutation.isPending ||
                executeDeletionMutation.isPending ||
                !deletePassword
              }
            >
              {deleteMode === 'immediate'
                ? (executeDeletionMutation.isPending ? 'Deleting…' : 'Delete Now')
                : (requestDeletionMutation.isPending ? 'Processing...' : 'Request Deletion')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
