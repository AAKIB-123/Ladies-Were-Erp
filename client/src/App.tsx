import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { ToastProvider } from './contexts/ToastContext';
import { AdminLayout } from './layouts/AdminLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { LocationsPage } from './pages/locations/LocationsPage';
import { UsersPage } from './pages/users/UsersPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StaffSalesPage } from './pages/sales/StaffSalesPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { SalesHistoryPage } from './pages/sales/SalesHistoryPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AppBrand } from './components/common/AppBrand';
import { ThemeProvider } from './contexts/ThemeContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: ('admin' | 'staff')[] }> = ({
  children,
  allowedRoles
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-content min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <AppBrand />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-gold-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gold-500" />
          </div>
          <span className="text-xs font-bold text-forest-700 uppercase tracking-wider">Loading your shop...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/staff/pos'} replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/staff/pos'} replace />;
};

const PlaceholderPage: React.FC<{ title: string; phase: string }> = ({ title, phase }) => (
  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center space-y-3">
    <h2 className="text-xl font-black text-slate-800">{title}</h2>
    <p className="text-xs text-slate-500 max-w-md mx-auto">
      This module is scheduled for implementation in <span className="font-bold text-pink-600">{phase}</span> according to the Master Architecture Roadmap.
    </p>
  </div>
);

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <ToastProvider>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="locations" element={<LocationsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="sales" element={<SalesHistoryPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Staff Routes */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="pos" replace />} />
                <Route path="pos" element={<StaffSalesPage />} />
                <Route path="history" element={<SalesHistoryPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="account" element={<PlaceholderPage title="My Account" phase="Phase 1" />} />
              </Route>

              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
