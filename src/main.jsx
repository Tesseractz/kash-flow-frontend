import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './lib/i18n' // Initialize i18n for translations
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import Products from './pages/Products'
import Sell from './pages/Sell'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AuthPage from './pages/Auth'
import Billing from './pages/Billing'
import Profile from './pages/Profile'
import Users from './pages/Users'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import PrivacySettings from './pages/PrivacySettings'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ProtectedRoute from './components/ProtectedRoute'

// Register service worker (required for Web Push on supported browsers).
// `updateViaCache: 'none'` forces the browser to bypass HTTP cache when
// checking for SW updates, so a new sw.js ships within minutes instead
// of being held for up to 24h by Chromium's default caching policy.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // Proactively check for an updated SW on registration. The browser
        // also checks ~hourly on its own, but this gives us a faster path
        // the first time a user opens the page after a deploy.
        try { reg.update() } catch (_) {}
      })
      .catch(() => {})
  })
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { 
        path: "/",
        element: (
          <ProtectedRoute>
            <Sell />
          </ProtectedRoute>
        ),
      },
      {
        path: "/sell",
        element: (
          <ProtectedRoute>
            <Sell />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute adminOnly>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      { 
        path: "/products",
        element: (
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        ),
      },
      {
        path: "/users",
        element: (
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        ),
      },
      {
        // Reports merged into Dashboard — keep old links working.
        path: "/reports",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/transactions",
        element: (
          <ProtectedRoute adminOnly>
            <Transactions />
          </ProtectedRoute>
        ),
      },
      { 
        path: "/auth",
        element: <AuthPage />,
      },
      { 
        path: "/billing",
        element: (
          <ProtectedRoute adminOnly>
            <Billing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customers",
        element: (
          <ProtectedRoute adminOnly>
            <Customers />
          </ProtectedRoute>
        ),
      },
      {
        path: "/expenses",
        element: (
          <ProtectedRoute adminOnly>
            <Expenses />
          </ProtectedRoute>
        ),
      },
      {
        path: "/privacy-settings",
        element: (
          <ProtectedRoute>
            <PrivacySettings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/terms",
        element: <Terms />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
    ],
  },
]);

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  </ThemeProvider>
)
