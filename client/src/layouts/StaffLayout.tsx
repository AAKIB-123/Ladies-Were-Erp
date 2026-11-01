import React from 'react';
import { NavLink, Outlet, useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ShoppingBag,
  History,
  Receipt,
  CreditCard,
  User,
  LogOut,
  Store
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { AppBrand } from '../components/common/AppBrand';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { locations, selectedLocation, setSelectedLocation } = useLocation();
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'New Sale', path: '/staff/pos', icon: ShoppingBag },
    { name: 'History', path: '/staff/history', icon: History },
    { name: 'Add Expense', path: '/staff/expenses', icon: Receipt },
    { name: 'Collect Payment', path: '/staff/payments', icon: CreditCard },
    { name: 'My Account', path: '/staff/account', icon: User },
  ];
  const activeItem = navItems.find((item) => routerLocation.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-gold-500/30 bg-forest-800 text-slate-200 lg:sticky lg:top-0 lg:flex">
        <div className="flex h-[76px] items-center border-b border-gold-500/25 px-5">
          <AppBrand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl border-l-2 px-3 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-gold-400 bg-white/10 text-gold-200'
                    : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-gold-500/25 bg-forest-900/30 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/50 bg-forest-700 text-sm font-bold text-gold-200">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-gold-300">Sales staff</p>
          </div>
          <button onClick={handleLogout} aria-label="Sign out" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-gold-300">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="app-shell flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="app-header sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-gold-500/25 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <AppBrand compact />
            </div>
            <div className="hidden min-w-0 items-center gap-2 text-[11px] text-slate-500 lg:flex">
              <span>Fancy Collection</span>
              <ChevronRight className="h-3 w-3 text-gold-600" />
              <span className="truncate font-semibold text-forest-800">{activeItem?.name || 'Workspace'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-cream/60 px-2.5 py-2">
              <Store className="h-4 w-4 shrink-0 text-gold-700" />
              {locations.length > 1 ? (
                <select
                  aria-label="Active location"
                  value={selectedLocation?._id || selectedLocation?.id || ''}
                  onChange={(e) => {
                    const found = locations.find((loc) => (loc._id || loc.id) === e.target.value);
                    setSelectedLocation(found || null);
                  }}
                  className="max-w-[150px] cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-forest-800 focus:ring-0"
                >
                  {locations.map((loc) => (
                    <option key={loc._id || loc.id} value={loc._id || loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : (
                <span className="max-w-[130px] truncate text-xs font-semibold text-forest-800">
                  {selectedLocation?.name || 'Assigned branch'}
                </span>
              )}
            </label>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-right">
                <span className="block text-xs font-bold text-forest-900">{user?.name}</span>
                <span className="block text-[10px] text-slate-500">Sales staff</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/50 bg-forest-800 text-xs font-bold text-gold-200">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <button onClick={handleLogout} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-cream hover:text-forest-800 sm:hidden">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="app-content flex-1 p-3 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
          <div key={routerLocation.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-gold-500/30 bg-white px-1 py-1.5 shadow-lg sm:px-2 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={item.name}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-1 text-[9px] font-bold tracking-tight transition-colors sm:px-2.5 sm:text-[10px] ${
                isActive ? 'bg-gold-50 text-forest-800' : 'text-slate-500 hover:text-forest-800'
              }`
            }
          >
            <item.icon className="mb-0.5 h-5 w-5" />
            <span className="max-w-[76px] truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
