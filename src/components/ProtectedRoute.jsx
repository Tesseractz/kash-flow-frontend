import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock } from 'lucide-react'
import { Card, CardContent } from './ui/Card'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin, passwordRecovery } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // A recovery link signs the user in before they have chosen a new password.
  // Supabase sends them to the Site URL when the redirect is not allow-listed,
  // so the link can land on any route — keep them on the reset form wherever
  // they arrive, otherwise the reset silently turns into a login.
  if (passwordRecovery) {
    return <Navigate to="/auth" replace />
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Access Restricted
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              This page is only available to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return children
}
