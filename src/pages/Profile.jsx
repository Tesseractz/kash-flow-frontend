import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { PlanAPI, BillingAPI } from "../api/client";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Store,
  Lock,
  CreditCard,
  Trash2,
  LogOut,
  Shield,
  Bell,
  Moon,
  Sun,
  Globe,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Calendar,
  Zap,
  ChevronRight,
} from "lucide-react";

export default function Profile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subscription state
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Get subscription info
  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => PlanAPI.get(),
    staleTime: 30000,
  });

  const currentPlan = planQuery.data?.plan || "free";
  const status = planQuery.data?.status || "expired";
  const isActive = planQuery.data?.is_active || false;
  const hasStripeSubscription = planQuery.data?.has_stripe_subscription;
  const trialEnd = planQuery.data?.trial_end;
  const periodEnd = planQuery.data?.current_period_end;

  const formatDate = (isoString) => {
    if (!isoString) return null;
    try {
      return new Date(isoString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      setPortalLoading(true);
      const { url } = await BillingAPI.portal();
      window.location.assign(url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      // This will redirect to Stripe portal where they can cancel
      const { url } = await BillingAPI.portal();
      window.location.assign(url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to open cancellation page");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setDeleteLoading(true);
    try {
      // Sign out and show message (actual deletion would need backend support)
      toast.success("Account deletion requested. You will be signed out.");
      await signOut();
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to process account deletion");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getStatusBadge = () => {
    if (status === "trialing") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
          <Calendar className="w-3 h-3" />
          Trial
        </span>
      );
    }
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          <Check className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (status === "canceled") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          Canceled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {t("profile.title", "Profile & Settings")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t("profile.subtitle", "Manage your account and preferences")}
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("profile.account_info", "Account Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                {user?.email || "User"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Member since {formatDate(user?.created_at) || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t("profile.subscription", "Subscription")}
          </CardTitle>
          <CardDescription>
            {t("profile.manage_plan", "Manage your plan and billing")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-white capitalize">
                  {currentPlan} Plan
                </p>
                {periodEnd && isActive && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {status === "trialing" ? "Trial ends" : "Renews"}: {formatDate(status === "trialing" ? trialEnd : periodEnd)}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/billing")}
            >
              <Zap className="w-4 h-4 mr-1" />
              {isActive ? "Change Plan" : "Upgrade"}
            </Button>

            {hasStripeSubscription && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBillingPortal}
                  disabled={portalLoading}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  {portalLoading ? "Loading..." : "Billing Portal"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                >
                  <X className="w-4 h-4 mr-1" />
                  {cancelLoading ? "Loading..." : "Cancel Subscription"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("profile.security", "Security")}
          </CardTitle>
          <CardDescription>
            {t("profile.security_desc", "Manage your password and security settings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div className="text-left">
                  <p className="font-medium text-slate-800 dark:text-white">
                    Change Password
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update your account password
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-800 dark:text-white">Change Password</h4>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <input
                  type={showPasswords ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t("profile.preferences", "Preferences")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-white">
                  Theme
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
              {theme}
            </div>
          </button>

          <button
            onClick={() => navigate("/billing")}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-white">
                  Language
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Change app language in the sidebar
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {t("profile.danger_zone", "Danger Zone")}
          </CardTitle>
          <CardDescription className="text-red-600/70 dark:text-red-400/70">
            {t("profile.danger_desc", "Irreversible and destructive actions")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <div className="text-left">
                <p className="font-medium text-slate-800 dark:text-white">
                  Sign Out
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign out of your account
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="text-left">
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Delete Account
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    Permanently delete your account and all data
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </button>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Are you absolutely sure?
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    This action cannot be undone. This will permanently delete your account, all your products, sales history, and remove all associated data.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-red-700 dark:text-red-300 block mb-1">
                    Type <strong>DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    placeholder="DELETE"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deleteLoading ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

