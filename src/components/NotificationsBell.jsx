import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  Bell,
  AlertTriangle,
  BarChart3,
  Mail,
  WifiOff,
  Settings,
} from "lucide-react";
import {
  AlertsAPI,
  NotificationsAPI,
  PlanAPI,
  ReportsAPI,
} from "../api/client";
import { Button } from "./ui/Button";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const getTodayUtc = () => new Date().toISOString().slice(0, 10);

export default function NotificationsBell() {
  const isOnline = useOnlineStatus();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusQuery = useQuery({
    queryKey: ["notification-status"],
    queryFn: () => NotificationsAPI.status(),
    enabled: isOnline,
    staleTime: 30000,
  });

  const settingsQuery = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => NotificationsAPI.getSettings(),
    enabled: isOnline,
    staleTime: 30000,
  });

  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => PlanAPI.get(),
    enabled: isOnline,
    staleTime: 60000,
  });

  const threshold = settingsQuery.data?.low_stock_threshold ?? 10;
  const canViewLowStock = planQuery.data?.limits?.low_stock_alerts === true;

  const lowStockQuery = useQuery({
    queryKey: ["low-stock-alerts", threshold],
    queryFn: () => AlertsAPI.getLowStock(threshold),
    enabled: isOnline && canViewLowStock,
    staleTime: 30000,
  });

  const today = getTodayUtc();
  const dailySummaryQuery = useQuery({
    queryKey: ["daily-summary", today],
    queryFn: () => ReportsAPI.get(today),
    enabled: isOnline,
    staleTime: 60000,
  });

  const sendLowStockMutation = useMutation({
    mutationFn: (payload) => NotificationsAPI.sendLowStockAlert(payload),
    onSuccess: () => {
      toast.success("Low stock email sent");
    },
    onError: (e) => {
      toast.error(e?.response?.data?.detail || "Failed to send alert");
    },
  });

  const sendSummaryMutation = useMutation({
    mutationFn: (payload) => NotificationsAPI.sendDailySummary(payload),
    onSuccess: () => {
      toast.success("Daily summary email sent");
    },
    onError: (e) => {
      toast.error(e?.response?.data?.detail || "Failed to send summary");
    },
  });

  const emailConfigured = statusQuery.data?.email_configured;
  const notificationEmail = settingsQuery.data?.notification_email;
  const canSendEmail = !!emailConfigured && !!notificationEmail;

  const lowStockCount = lowStockQuery.data?.length || 0;
  const hasDailySummary = !!dailySummaryQuery.data?.totals;
  const badgeCount =
    (lowStockCount > 0 ? 1 : 0) + (hasDailySummary ? 1 : 0);

  const totals = dailySummaryQuery.data?.totals || {};
  const totalRevenue = Number(totals.total_revenue || 0);
  const totalProfit = Number(totals.total_profit || 0);
  const totalSales = Number(totals.total_sales_count || 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
          )}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Notifications
            </p>
            <Link
              to="/profile"
              className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              onClick={() => setOpen(false)}
            >
              <Settings size={14} />
              Manage
            </Link>
          </div>

          {!isOnline && (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <WifiOff className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              Offline. Connect to refresh notifications.
            </div>
          )}

          {isOnline && (
            <div className="max-h-96 overflow-auto">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Low stock alerts
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {canViewLowStock
                        ? `${lowStockCount} products below ${threshold}`
                        : "Upgrade to Pro to enable alerts"}
                    </p>
                    {canViewLowStock && (
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          to="/products"
                          className="text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => setOpen(false)}
                        >
                          View products
                        </Link>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!canSendEmail || sendLowStockMutation.isLoading}
                          onClick={() =>
                            sendLowStockMutation.mutate({
                              threshold,
                              email: notificationEmail,
                              send_email: true,
                            })
                          }
                        >
                          <Mail size={12} />
                          Email me
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <BarChart3 size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Daily finance summary
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sales: {totalSales} · Revenue: R {totalRevenue.toFixed(2)} ·
                      Profit: R {totalProfit.toFixed(2)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to="/reports"
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => setOpen(false)}
                      >
                        Open reports
                      </Link>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!canSendEmail || sendSummaryMutation.isLoading}
                        onClick={() =>
                          sendSummaryMutation.mutate({
                            date_utc: today,
                            email: notificationEmail,
                            send_email: true,
                          })
                        }
                      >
                        <Mail size={12} />
                        Email me
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {canSendEmail === false && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Add a notification email in Profile → Notifications to enable emails.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

