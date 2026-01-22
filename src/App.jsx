import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
  CreditCard,
  Sun,
  Moon,
  PieChart,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { Button } from "./components/ui/Button";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Logo, LogoIcon } from "./components/Logo";
import NotificationsBell from "./components/NotificationsBell";

const navItems = [
  { to: "/sell", icon: ShoppingCart, labelKey: "nav.sell", adminOnly: false },
  { to: "/products", icon: Package, labelKey: "nav.products", adminOnly: false },
  { to: "/users", icon: User, labelKey: "nav.users", adminOnly: true },
  { to: "/reports", icon: BarChart3, labelKey: "nav.reports", adminOnly: true },
  { to: "/analytics", icon: PieChart, labelKey: "nav.analytics", adminOnly: true },
  { to: "/billing", icon: CreditCard, labelKey: "nav.billing", adminOnly: true },
];

function NavLink({ to, icon: Icon, labelKey, onClick }) {
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      <Icon size={20} />
      <span>{t(labelKey)}</span>
    </Link>
  );
}

function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
        aria-label={theme === "dark" ? t("nav.light_mode") : t("nav.dark_mode")}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
      aria-label={theme === "dark" ? t("nav.light_mode") : t("nav.dark_mode")}
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      <span>{theme === "dark" ? t("nav.light_mode") : t("nav.dark_mode")}</span>
    </button>
  );
}

function UserDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {user?.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <ChevronDown
          size={16}
          className={clsx(
            "text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
              {user?.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Store Owner
            </p>
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Settings size={16} />
            {t("nav.profile", "Profile & Settings")}
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} />
            {t("nav.sign_out")}
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ mobile, onClose }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside
      className={clsx(
        "flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700",
        mobile ? "w-full h-full" : "w-64 min-h-screen"
      )}
    >
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Logo size={36} />
          {mobile && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink 
            key={item.to} 
            {...item} 
            onClick={mobile ? onClose : undefined}
          />
        ))}

        {/* Only show theme toggle in sidebar on desktop */}
        {!mobile && (
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
            <ThemeToggle />
          </div>
        )}
      </nav>

      {/* Mobile-only bottom section */}
      {mobile && <MobileSidebarFooter onClose={onClose} />}
    </aside>
  );
}

function MobileSidebarFooter({ onClose }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <Link
        to="/profile"
        onClick={onClose}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {user?.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {user?.email || "User"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Settings size={10} />
            {t("nav.profile", "Profile & Settings")}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={handleSignOut}
      >
        <LogOut size={18} />
        {t("nav.sign_out")}
      </Button>
    </div>
  );
}

function DesktopHeader() {
  return (
    <header className="hidden lg:flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 items-center justify-end gap-3">
      <NotificationsBell />
      <ThemeToggle compact />
      <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
      <UserDropdown />
    </header>
  );
}

function MobileHeader({ onMenuOpen }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-40 px-4 flex items-center justify-between">
      <Logo size={32} />
      <div className="flex items-center gap-1">
        <NotificationsBell />
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={onMenuOpen}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <LogoIcon size={64} />
          </div>
          <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex overflow-x-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
        <DesktopHeader />

        <main className="flex-1 p-3 sm:p-4 lg:p-8 mt-16 lg:mt-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
