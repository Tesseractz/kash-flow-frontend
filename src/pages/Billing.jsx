import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { BillingAPI, PlanAPI } from '../api/client'
import toast from 'react-hot-toast'
import { Check, Zap, Building2, Package, Users, FileText, Bell, Shield, CreditCard, Calendar, AlertTriangle } from 'lucide-react'

const plans = [
  {
    name: 'Pro',
    price: 'R250',
    period: '/month',
    description: 'For growing businesses',
    icon: Zap,
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    popular: true,
    features: [
      'Unlimited products',
      'Up to 3 users',
      'Advanced analytics',
      'Low stock alerts',
      'CSV export',
      'Priority support',
    ],
    planId: 'pro',
  },
  {
    name: 'Business',
    price: 'R350',
    period: '/month',
    description: 'For larger operations',
    icon: Building2,
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Role-based access',
      'Audit logs',
      'API access',
      'Dedicated support',
    ],
    planId: 'business',
  },
]

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

  const currentPlan = planQuery.data?.plan || 'expired'
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
      const { url } = await BillingAPI.checkout(plan)
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
          Choose Your Plan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 sm:mt-2">
          Start with a 7-day free trial. No credit card required to start.
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Package className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {usage.products || 0}
                  {limits.max_products && (
                    <span className="text-sm font-normal text-slate-500">
                      /{limits.max_products}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Products
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Users className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  1
                  <span className="text-sm font-normal text-slate-500">
                    /{limits.max_users || 1}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Users
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <FileText className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {limits.csv_export ? (
                    <Check className="w-5 h-5 mx-auto text-emerald-500" />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CSV Export
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Bell className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {limits.low_stock_alerts ? (
                    <Check className="w-5 h-5 mx-auto text-emerald-500" />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Alerts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isActive && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  Your subscription is not active
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Subscribe to Pro or Business to unlock all features. Start
                  with a 7-day free trial!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlan && isActive;
          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-blue-600 dark:border-blue-500 border-2 shadow-lg shadow-blue-600/10"
                  : ""
              } ${isCurrent ? "ring-2 ring-emerald-500" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Current
                  </span>
                </div>
              )}
              <CardContent className="p-6">
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

                <div className="mt-4 mb-2">
                  <span className="text-4xl font-bold text-slate-800 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                  7-day free trial included
                </p>

                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className="w-full"
                    onClick={() => upgrade(plan.planId)}
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : isActive
                      ? "Switch Plan"
                      : "Start Free Trial"}
                  </Button>
                )}

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    What's included:
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardContent className="py-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Need a custom plan for your enterprise?{" "}
            <a
              href="mailto:support@kash-flow.com"
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
