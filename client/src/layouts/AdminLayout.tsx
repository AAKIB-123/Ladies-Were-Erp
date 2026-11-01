import React, { useState } from 'react';
import { NavLink, Outlet, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { AppBrand } from '../components/common/AppBrand';
import { ThemeToggle } from '../components/common/ThemeToggle';
import api from '../services/api';

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Sales & Billing', path: '/admin/sales', icon: ShoppingCart },
  { name: 'Purchases', path: '/admin/purchases', icon: Package },
  { name: 'Products', path: '/admin/products', icon: Tags },
  { name: 'Inventory', path: '/admin/inventory', icon: Boxes },
  { name: 'Locations', path: '/admin/locations', icon: MapPin },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Suppliers', path: '/admin/suppliers', icon: Truck },
  { name: 'Expenses', path: '/admin/expenses', icon: Receipt },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard },
  { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { name: 'Staff & Permissions', path: '/admin/users', icon: UserCog },
  { name: 'Audit Log', path: '/admin/audit-logs', icon: FileClock },
  { name: 'Settings', path: '/admin/settings', icon: Settings }
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { locations, selectedLocation, setSelectedLocation } = useLocation();
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fc_sidebar_collapsed') === 'true');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lowStockAlertCount, setLowStockAlertCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const selectedLocationId = selectedLocation?._id || selectedLocation?.id;

  React.useEffect(() => {
    let cancelled = false;
    const fetchLowStockAlerts = async () => {
      try {
        setNotificationError(null);
        setLowStockAlertCount(0);
        const params: Record<string, string> = { period: 'this_month' };
        if (selectedLocationId) params.locationId = selectedLocationId;
        const response = await api.get('/reports/dashboard', { params });
        const count = response.data?.data?.kpis?.lowStockAlertCount;
        if (!response.data?.success || typeof count !== 'number') {
          throw new Error('The low-stock alert count was not included in the report.');
        }
        if (!cancelled) setLowStockAlertCount(count);
      } catch (error: any) {
        if (!cancelled) {
          setNotificationError(error.response?.data?.message || error.message || 'Unable to load stock alerts.');
        }
      }
    };

    fetchLowStockAlerts();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeItem = navItems.find((item) => routerLocation.pathname.startsWith(item.path));
  const breadcrumb = activeItem?.name || 'Workspace';

  const toggleSidebar = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    localStorage.setItem('fc_sidebar_collapsed', String(nextCollapsed));
  };

  return (
    <div className="min-h-screen bg-cream lg:flex">
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-forest-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-gold-500/30 bg-forest-800 text-slate-200 transition-[width,transform] duration-200 ease-out lg:sticky lg:top-0 lg:translate-x-0 ${
          collapsed ? 'w-[17rem] lg:w-20' : 'w-[17rem]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex h-[76px] items-center border-b border-gold-500/25 ${collapsed && !sidebarOpen ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {collapsed && !sidebarOpen ? (
            <img
              src="/fancy-collection-logo.png"
              alt="Fancy Collection"
              className="h-14 w-14 object-contain"
            />
          ) : (
            <AppBrand />
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-gold-300 lg:block ${collapsed ? 'absolute -right-3 top-6 z-10 border border-gold-500/40 bg-forest-800 shadow-md' : ''}`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {(!collapsed || sidebarOpen) && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed && !sidebarOpen ? item.name : undefined}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold tracking-wide transition-all ${
                  collapsed && !sidebarOpen ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'border-l-2 border-gold-400 bg-white/10 text-gold-200'
                    : 'border-l-2 border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {(!collapsed || sidebarOpen) && <span className="truncate">{item.name}</span>}
              {collapsed && !sidebarOpen && (
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-forest-950 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gold-500/25 bg-forest-900/30 p-4 ${collapsed && !sidebarOpen ? 'flex justify-center' : ''}`}>
          {collapsed && !sidebarOpen ? (
            <button
              type="button"
              onClick={handleLogout}
              title={`Sign out ${user?.name || ''}`}
              aria-label="Sign out"
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-gold-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/50 bg-forest-700 text-sm font-bold text-gold-200">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{user?.name}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gold-300">Administrator</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-gold-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="app-shell flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="app-header sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-gold-500/25 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-forest-700 hover:bg-cream lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="hidden items-center gap-2 text-[11px] font-medium text-slate-500 sm:flex">
                <span>Fancy Collection</span>
                <ChevronRight className="h-3 w-3 text-gold-600" />
                <span className="truncate text-forest-800">{breadcrumb}</span>
              </div>
              <p className="truncate text-sm font-bold text-forest-900 sm:mt-1">{breadcrumb}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            <ThemeToggle />
            <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-cream/60 px-1.5 py-2 sm:gap-2 sm:px-3">
              <Store className="h-4 w-4 shrink-0 text-gold-700" />
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-500 xl:block">Location</span>
              <select
                aria-label="Active location"
                value={selectedLocation?._id || selectedLocation?.id || ''}
                onChange={(e) => {
                  const found = locations.find((location) => (location._id || location.id) === e.target.value);
                  setSelectedLocation(found || null);
                }}
                className="max-w-[72px] cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-forest-800 focus:ring-0 sm:max-w-[190px]"
              >
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location._id || location.id} value={location._id || location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label={`Notifications${lowStockAlertCount ? `, ${lowStockAlertCount} low-stock alerts` : ''}`}
              aria-expanded={notificationsOpen}
              className="relative rounded-xl p-2 text-slate-500 transition hover:bg-cream hover:text-forest-800 sm:p-2.5"
            >
              <Bell className="h-[18px] w-[18px]" />
              {lowStockAlertCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-600 px-1 text-[9px] font-bold text-white">
                  {lowStockAlertCount > 9 ? '9+' : lowStockAlertCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-16 top-[68px] z-50 w-72 rounded-xl border border-gold-500/25 bg-white p-3 shadow-xl sm:right-24">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold text-forest-900">Notifications</p>
                  {lowStockAlertCount > 0 && (
                    <span className="text-[10px] font-semibold text-gold-700">{lowStockAlertCount} active</span>
                  )}
                </div>
                {notificationError ? (
                  <p role="alert" className="text-xs font-medium text-rose-700">{notificationError}</p>
                ) : lowStockAlertCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/admin/inventory');
                    }}
                    className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition hover:bg-cream"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                    <span>
                      <span className="block text-xs font-semibold text-forest-900">Low stock needs attention</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {lowStockAlertCount} item{lowStockAlertCount === 1 ? '' : 's'} below the stock threshold.
                      </span>
                    </span>
                  </button>
                ) : (
                  <p className="px-2 py-3 text-center text-xs text-slate-500">No active stock alerts.</p>
                )}
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-cream sm:p-1.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/50 bg-forest-800 text-xs font-bold text-gold-200">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block max-w-32 truncate text-xs font-bold text-forest-900">{user?.name}</span>
                  <span className="block text-[10px] text-slate-500">Administrator</span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gold-500/25 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-bold text-forest-900">{user?.name}</p>
                    <p className="text-[10px] text-slate-500">Administrator</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-cream"
                  >
                    Account settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content flex-1 p-4 sm:p-6 lg:p-8">
          <div key={routerLocation.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
