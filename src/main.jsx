import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './lib/i18n' // Initialize i18n for translations
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import Products from './pages/Products'
import Sell from './pages/Sell'
import Reports from './pages/Reports'
import AuthPage from './pages/Auth'
import Billing from './pages/Billing'
import Profile from './pages/Profile'
import Users from './pages/Users'
import Categories from './pages/Categories'
import Customers from './pages/Customers'
import Discounts from './pages/Discounts'
import Expenses from './pages/Expenses'
import Employees from './pages/Employees'
import PrivacySettings from './pages/PrivacySettings'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ProtectedRoute from './components/ProtectedRoute'

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
        path: "/reports",
        element: (
          <ProtectedRoute adminOnly>
            <Reports />
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
        path: "/categories",
        element: (
          <ProtectedRoute adminOnly>
            <Categories />
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
        path: "/discounts",
        element: (
          <ProtectedRoute adminOnly>
            <Discounts />
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
        path: "/employees",
        element: (
          <ProtectedRoute adminOnly>
            <Employees />
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
