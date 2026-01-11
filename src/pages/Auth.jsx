import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import toast from "react-hot-toast";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { Logo } from "../components/Logo";
import {
  Store,
  Mail,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle,
  KeyRound,
} from "lucide-react";

// Auth modes
const MODE = {
  SIGN_IN: "signin",
  SIGN_UP: "signup",
  FORGOT_PASSWORD: "forgot",
  RESET_PASSWORD: "reset",
  EMAIL_CONFIRMATION_SENT: "email_sent",
  PASSWORD_RESET_SENT: "reset_sent",
};

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [mode, setMode] = useState(MODE.SIGN_IN);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = location.state?.from?.pathname || "/";

  // Handle auth callbacks (email confirmation, password reset)
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for password reset flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken) {
        // User clicked password reset link
        setMode(MODE.RESET_PASSWORD);
        return;
      }

      // Check for email confirmation
      if (type === "signup" || type === "email_change") {
        toast.success("Email confirmed! You can now sign in.");
        setMode(MODE.SIGN_IN);
        // Clear the hash
        window.history.replaceState(null, "", window.location.pathname);
      }

      // Check for error in URL
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (error) {
        toast.error(errorDescription || "Authentication error");
      }
    };

    handleAuthCallback();
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && mode !== MODE.RESET_PASSWORD) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, mode]);

  const validateForm = () => {
    if (mode === MODE.FORGOT_PASSWORD) {
      if (!email) {
        toast.error("Please enter your email");
        return false;
      }
      return true;
    }

    if (mode === MODE.RESET_PASSWORD) {
      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
      return true;
    }

    if (!email || !password) {
      toast.error("Email and password are required");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (mode === MODE.SIGN_UP) {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
      if (!storeName.trim()) {
        toast.error("Store name is required");
        return false;
      }
    }
    return true;
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    toast.success("Welcome back!");
    navigate(from, { replace: true });
  };

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          store_name: storeName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) throw error;

    // Check if email confirmation is required
    if (data.user && !data.session) {
      setMode(MODE.EMAIL_CONFIRMATION_SENT);
    } else if (data.session) {
      toast.success("Account created successfully!");
      navigate("/");
    }
  };

  const handleForgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
    setMode(MODE.PASSWORD_RESET_SENT);
  };

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    toast.success("Password updated successfully!");
    // Clear the hash and redirect to sign in
    window.history.replaceState(null, "", window.location.pathname);
    setMode(MODE.SIGN_IN);
    setPassword("");
    setConfirmPassword("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      switch (mode) {
        case MODE.SIGN_IN:
          await handleSignIn();
          break;
        case MODE.SIGN_UP:
          await handleSignUp();
          break;
        case MODE.FORGOT_PASSWORD:
          await handleForgotPassword();
          break;
        case MODE.RESET_PASSWORD:
          await handleResetPassword();
          break;
        default:
          break;
      }
    } catch (e) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const { theme, toggleTheme } = useTheme();

  // Success states (email sent screens)
  if (mode === MODE.EMAIL_CONFIRMATION_SENT) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AuthTopButtons theme={theme} toggleTheme={toggleTheme} />
        <div className="w-full max-w-md">
          <AuthHeader />
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {t("auth.check_email")}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t("auth.email_sent")}{" "}
                <strong className="text-slate-800 dark:text-white">
                  {email}
                </strong>
                . {t("auth.click_to_activate")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMode(MODE.SIGN_IN);
                  setEmail("");
                  setPassword("");
                }}
                className="w-full"
              >
                <ArrowLeft size={18} />
                {t("auth.back_to_signin")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === MODE.PASSWORD_RESET_SENT) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AuthTopButtons theme={theme} toggleTheme={toggleTheme} />
        <div className="w-full max-w-md">
          <AuthHeader />
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {t("auth.check_email")}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t("auth.reset_sent")}{" "}
                <strong className="text-slate-800 dark:text-white">
                  {email}
                </strong>
                . {t("auth.click_to_reset")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMode(MODE.SIGN_IN);
                  setEmail("");
                }}
                className="w-full"
              >
                <ArrowLeft size={18} />
                {t("auth.back_to_signin")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password form
  if (mode === MODE.RESET_PASSWORD) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AuthTopButtons theme={theme} toggleTheme={toggleTheme} />
        <div className="w-full max-w-md">
          <AuthHeader />
          <Card>
            <CardContent className="p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("auth.new_password")}
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      placeholder={t("auth.new_password")}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("auth.confirm_new_password")}
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      placeholder={t("auth.confirm_new_password")}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    t("loading")
                  ) : (
                    <>
                      {t("auth.update_password")}
                      <CheckCircle size={18} />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (mode === MODE.FORGOT_PASSWORD) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <AuthTopButtons theme={theme} toggleTheme={toggleTheme} />
        <div className="w-full max-w-md">
          <AuthHeader />
          <Card>
            <CardContent className="p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    t("loading")
                  ) : (
                    <>
                      {t("auth.send_reset_link")}
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode(MODE.SIGN_IN)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft size={16} />
                  {t("auth.back_to_signin")}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main sign in / sign up form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuthTopButtons theme={theme} toggleTheme={toggleTheme} />

      <div className="w-full max-w-md">
        <AuthHeader
          subtitle={
            mode === MODE.SIGN_UP
              ? t("auth.create_account")
              : t("auth.welcome_back")
          }
        />

        <Card>
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === MODE.SIGN_UP && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("auth.store_name")}
                  </label>
                  <div className="relative">
                    <Store
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      placeholder={t("auth.store_name")}
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("auth.password")}
                  </label>
                  {mode === MODE.SIGN_IN && (
                    <button
                      type="button"
                      onClick={() => setMode(MODE.FORGOT_PASSWORD)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {t("auth.forgot_password")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    placeholder={t("auth.password")}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === MODE.SIGN_UP
                        ? "new-password"
                        : "current-password"
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {mode === MODE.SIGN_UP && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("auth.confirm_password")}
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      placeholder={t("auth.confirm_password")}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  t("loading")
                ) : (
                  <>
                    {mode === MODE.SIGN_UP
                      ? t("auth.sign_up")
                      : t("auth.sign_in")}
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === MODE.SIGN_UP ? MODE.SIGN_IN : MODE.SIGN_UP);
                  setConfirmPassword("");
                  setStoreName("");
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                {mode === MODE.SIGN_UP
                  ? t("auth.have_account")
                  : t("auth.no_account")}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleClearSession}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t("auth.session_trouble")}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
          {t("auth.powered_by")}
        </p>
      </div>
    </div>
  );
}

// Helper components
function AuthHeader({ subtitle }) {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <Logo size={56} showText={false} />
      </div>
      <h1 className="text-3xl font-bold">
        <span className="text-emerald-600 dark:text-emerald-400">Kash</span>
        <span className="text-amber-500 dark:text-amber-400">-Flow</span>
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-1">
        Point of Sale
      </p>
      {subtitle && (
        <p className="text-slate-500 dark:text-slate-400 mt-3">{subtitle}</p>
      )}
    </div>
  );
}

function AuthTopButtons({ theme, toggleTheme }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <LanguageSwitcher compact />
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
}
