import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { BillingAPI, PlanAPI } from '../api/client'
import toast from 'react-hot-toast'
import { Check, X, Zap, Package, Users, FileText, Bell, CreditCard, Calendar, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const plan = {
  name: 'Pro',
  price: 'R190',
  period: '/month',
  description: 'Everything unlocked for your store',
  icon: Zap,
  iconBg: 'bg-blue-100 dark:bg-blue-900/50',
  iconColor: 'text-blue-600 dark:text-blue-400',
  features: [
    { text: 'Unlimited products', included: true },
    { text: 'Unlimited team members', included: true },
    { text: 'Advanced analytics', included: true },
    { text: 'Low stock alerts', included: true },
    { text: 'CSV export', included: true },
    { text: 'Audit logs', included: true },
  ],
  planId: 'pro',
}

function formatDate(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return null
  }
}

function daysUntil(isoString) {
  if (!isoString) return null
  try {
    const target = new Date(isoString)
    const now = new Date()
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
    return diff
  } catch {
    return null
  }
}

export default function Billing() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated successfully!");
      qc.invalidateQueries({ queryKey: ["plan"] });
    } else if (searchParams.get("canceled") === "1") {
      toast("Checkout was canceled");
    }
  }, [searchParams, qc]);

  const planQuery = useQuery({
    queryKey: ['plan'],
    queryFn: () => PlanAPI.get(),
    staleTime: 30000,
  })

  const currentPlanRaw = planQuery.data?.plan || 'expired'
  const currentPlan = currentPlanRaw === 'business' ? 'pro' : currentPlanRaw
  const status = planQuery.data?.status || 'expired'
  const isActive = planQuery.data?.is_active || false
  const limits = planQuery.data?.limits || {}
  const usage = planQuery.data?.usage || {}
  const trialEnd = planQuery.data?.trial_end
  const periodEnd = planQuery.data?.current_period_end
  const hasStripeSubscription = planQuery.data?.has_stripe_subscription

  const trialDaysLeft = daysUntil(trialEnd)
  const isTrialing = status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 0

  const upgrade = async (plan) => {
    if (plan === currentPlan && isActive) {
      toast('You are already on this plan')
      return
    }
    try {
      setLoading(true)
      const email = user?.email || user?.user_metadata?.email || ''
      const { url } = await BillingAPI.checkout({ plan, email })
      window.location.assign(url)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  const openPortal = async () => {
    try {
      setPortalLoading(true)
      const { url } = await BillingAPI.portal()
      window.location.assign(url)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (isTrialing) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
          <Calendar className="w-4 h-4" />
          Trial: {trialDaysLeft} days left
        </span>
      )
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          <Check className="w-4 h-4" />
          Active
        </span>
      )
    }
    if (status === 'past_due') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" />
          Payment Failed
        </span>
      )
    }
    if (status === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          Canceled
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
        No Active Plan
      </span>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
          Pro Plan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">
          One plan. Full access. Start with a 30-day free trial.
        </p>
      </div>

      {planQuery.data && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
          <CardContent className="py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Current Plan:{" "}
                    <span className="text-blue-600 dark:text-blue-400 capitalize">
                      {currentPlan}
                    </span>
                  </h3>
                  {periodEnd && isActive && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {isTrialing ? "Trial ends" : "Next billing date"}:{" "}
                      {formatDate(isTrialing ? trialEnd : periodEnd)}
                    </p>
                  )}
                </div>
                {getStatusBadge()}
              </div>

              <div className="flex flex-wrap gap-2">
                {hasStripeSubscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {portalLoading ? "Loading..." : "Manage Subscription"}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm min-w-0">
                <Package className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {usage.products || 0}
                  {limits.max_products && (
                    <span className="text-sm font-normal text-slate-500">
                      /{limits.max_products}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Products
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm min-w-0">
                <Users className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  1
                  <span className="text-sm font-normal text-slate-500">
                    /{limits.max_users || 1}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Users
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm min-w-0">
                <FileText className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {limits.csv_export ? (
                    <Check className="w-5 h-5 mx-auto text-emerald-500" />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  CSV Export
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm min-w-0">
                <Bell className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {limits.low_stock_alerts ? (
                    <Check className="w-5 h-5 mx-auto text-emerald-500" />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Alerts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isTrialing && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-emerald-800 dark:text-emerald-200 font-medium">
                  🎉 Trial Active — Full Access Unlocked!
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  You have access to <strong>all features</strong> during your trial period ({trialDaysLeft} days remaining).
                  After the trial ends, features will be locked until you subscribe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isActive && !isTrialing && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  Your subscription is not active
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Start your 30-day free trial to unlock all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 max-w-2xl mx-auto">
        <Card className="relative border-blue-600 dark:border-blue-500 border-2 shadow-lg shadow-blue-600/10">
          {(currentPlan === 'pro') && (
            <div className="absolute -top-3 right-4">
              <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Current
              </span>
            </div>
          )}
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={`w-12 h-12 ${plan.iconBg} rounded-xl flex items-center justify-center mb-4`}
                >
                  <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {plan.description}
                </p>
              </div>
              <div className="text-right">
                <div className="mt-1">
                  <span className="text-4xl font-bold text-slate-800 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                  30-day free trial • Card required
                </p>
              </div>
            </div>

            <div className="mt-5">
              {(currentPlan === 'pro' && isActive) ? (
                <Button variant="secondary" className="w-full" disabled>
                  Active
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => upgrade(plan.planId)}
                  disabled={loading}
                >
                  {loading ? "Processing..." : (hasStripeSubscription ? "Resume Pro" : "Start Free Trial")}
                </Button>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                What's included:
              </p>
              <ul className="space-y-2.5">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardContent className="py-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Need a custom plan for your enterprise?{" "}
            <a
              href="mailto:support@kashpoint.com"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Contact our sales team
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
