import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building,
  CreditCard,
  RefreshCw,
  PlusCircle,
  FileText,
  Boxes,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { Badge } from '../../components/common/Badge';
import { AppBrand } from '../../components/common/AppBrand';

interface DashboardData {
  kpis: {
    netSales: number;
    confirmedGrossProfit: number;
    confirmedNetProfit: number;
    isProvisional: boolean;
    unresolvedQuickSaleRevenue: number;
    unresolvedQuickSaleCount: number;
    provisionalNetProfit: number;
    provisionalWarning: string | null;
    totalOperatingExpenses: number;
    totalPurchases: number;
    cashReceipts: number;
    upiReceipts: number;
    bankReceipts: number;
    totalCustomerReceivables: number;
    totalSupplierPayables: number;
    totalInventoryUnits: number;
    totalInventoryValuation: number;
    lowStockAlertCount: number;
  };
  charts: {
    salesByLocation: { name: string; netSales: number; salesCount: number }[];
    expensesByCategory: { category: string; amount: number }[];
  };
  pnl: any;
}

interface RecentSale {
  _id: string;
  saleNumber: string;
  customerName?: string;
  saleDate: string;
  netAmount: number;
  paymentMethod: string;
  items: Array<{ productName: string; quantity: number }>;
}

interface RecentPurchase {
  _id: string;
  invoiceNumber: string;
  supplierId?: { name: string } | string;
  purchaseDate: string;
  totalAmount: number;
}

const COLORS = ['#263D2B', '#B58A3E', '#49684E', '#D7BC7B', '#19291D', '#C8A253', '#718C75', '#98702F'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedLocation, locations } = useLocation();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<string>('this_month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [recentSalesError, setRecentSalesError] = useState<string | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [recentPurchasesError, setRecentPurchasesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const periods = Array.from(new Set([period, 'today', 'this_month']));
      const responses = await Promise.all(
        periods.map((requestedPeriod) => {
          const params: Record<string, string> = { period: requestedPeriod };
          const locationId = selectedLocation?._id || selectedLocation?.id;
          if (locationId) params.locationId = locationId;
          return api.get('/reports/dashboard', { params });
        })
      );
      const reports: Record<string, DashboardData> = {};
      responses.forEach((res, index) => {
        if (res.data.success) reports[periods[index]] = res.data.data;
      });
      setData(reports[period] || null);
      setTodaySales(reports.today?.kpis.netSales || 0);
      setMonthlySales(reports.this_month?.kpis.netSales || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period, selectedLocation]);

  useEffect(() => {
    const fetchRecentSales = async () => {
      try {
        setRecentSalesError(null);
        const params: Record<string, string> = {};
        const locationId = selectedLocation?._id || selectedLocation?.id;
        if (locationId) params.locationId = locationId;
        const res = await api.get('/sales', { params });
        if (res.data.success) setRecentSales(res.data.sales.slice(0, 200));
      } catch (err: any) {
        setRecentSalesError(err.response?.data?.message || 'Unable to load recent sales.');
      }
    };

    fetchRecentSales();
  }, [selectedLocation]);

  useEffect(() => {
    let cancelled = false;
    const fetchRecentPurchases = async () => {
      try {
        setRecentPurchasesError(null);
        const params: Record<string, string> = {};
        const locationId = selectedLocation?._id || selectedLocation?.id;
        if (locationId) params.locationId = locationId;
        const response = await api.get('/purchases', { params });
        if (!response.data.success) {
          throw new Error('The purchase history could not be loaded.');
        }
        if (!cancelled) setRecentPurchases(response.data.purchases.slice(0, 6));
      } catch (error: any) {
        if (!cancelled) {
          setRecentPurchasesError(error.response?.data?.message || error.message || 'Unable to load recent purchases.');
        }
      }
    };

    fetchRecentPurchases();
    return () => {
      cancelled = true;
    };
  }, [selectedLocation]);

  const kpis = data?.kpis;

  const grossMargin = kpis && kpis.netSales > 0
    ? Math.round((kpis.confirmedGrossProfit / kpis.netSales) * 1000) / 10
    : 0;
  const netMargin = kpis && kpis.netSales > 0
    ? Math.round((kpis.confirmedNetProfit / kpis.netSales) * 1000) / 10
    : 0;
  const bestSellingProducts = recentSales
    .reduce<Record<string, number>>((totals, sale) => {
      sale.items?.forEach((item) => {
        totals[item.productName] = (totals[item.productName] || 0) + item.quantity;
      });
      return totals;
    }, {});
  const topProducts = Object.entries(bestSellingProducts)
    .sort(([, quantityA], [, quantityB]) => quantityB - quantityA)
    .slice(0, 5);
  const salesAnalytics = Object.entries(
    recentSales.reduce<Record<string, number>>((totals, sale) => {
      const date = sale.saleDate.slice(0, 10);
      totals[date] = (totals[date] || 0) + sale.netAmount;
      return totals;
    }, {})
  )
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-7)
    .map(([date, netSales]) => ({
      date: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      netSales
    }));
  const monthlySalesAnalytics = Object.entries(
    recentSales.reduce<Record<string, number>>((totals, sale) => {
      const date = new Date(sale.saleDate);
      if (Number.isNaN(date.getTime())) return totals;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      totals[month] = (totals[month] || 0) + sale.netAmount;
      return totals;
    }, {})
  )
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .slice(-6)
    .map(([month, netSales]) => {
      const [year, monthNumber] = month.split('-').map(Number);
      return {
        month: new Date(year, monthNumber - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        netSales
      };
    });

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="relative overflow-hidden rounded-3xl border border-gold-500/45 bg-forest-800 p-6 text-white shadow-lg shadow-forest-900/10 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] bg-white/10 text-gold-200 border border-gold-500/40">
                Boutique overview
              </span>
              <span className="text-xs text-cream/80 font-medium">
                Scope: {selectedLocation ? selectedLocation.name : 'Consolidated (All Branches)'}
              </span>
            </div>
            <div className="mb-5">
              <AppBrand />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-cream/80 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              A clear view of today’s trade, stock position, and the health of your boutique.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/10 p-1.5 rounded-2xl border border-gold-500/30">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Time' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                  period === tab.id
                    ? 'bg-gold-500 text-forest-900 shadow-sm'
                    : 'text-cream/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={fetchDashboard}
              title="Refresh Data"
              className="p-1.5 text-cream/80 hover:text-gold-300 hover:bg-white/10 rounded-xl transition-colors ml-1"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="shrink-0 text-xs font-bold underline underline-offset-2">
            Retry loading dashboard
          </button>
        </div>
      )}

      {/* Provisional Revenue Warning Alert */}
      {kpis?.isProvisional && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-amber-900">Provisional Financial Figures</h4>
                <Badge variant="provisional">Action Required</Badge>
              </div>
              <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                {kpis.provisionalWarning}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Provisional Net Profit: <span className="font-bold">₹{kpis.provisionalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> (assumes ₹0 product cost until reconciled).
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/sales')}
            className="whitespace-nowrap px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm transition-all"
          >
            Reconcile Quick Sales
          </button>
        </div>
      )}

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today’s Sales</span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">
            ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Net sales recorded today</div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Sales</span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">
            ₹{monthlySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Net sales recorded this month</div>
        </div>

        {/* Confirmed Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">
            ₹{(kpis?.netSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Net revenue for selected period</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-forest-700">
              ₹{kpis?.confirmedGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-xs text-forest-700 font-bold flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" />
            <span>{grossMargin}% Gross Margin</span>
          </div>
        </div>

        {/* Confirmed Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${((kpis?.confirmedNetProfit || 0) >= 0) ? 'text-forest-700' : 'text-rose-600'}`}>
              ₹{kpis?.confirmedNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-xs text-forest-700 font-bold flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" />
            <span>{netMargin}% Net Margin (after expenses)</span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-600">
              ₹{kpis?.totalOperatingExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            <span>Rent, staff salary, utilities & packaging</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm hover:border-gold-500/70 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchase</span>
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">
            ₹{(kpis?.totalPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Purchases for selected period</div>
        </div>
      </div>

      {/* Secondary Row: Cash/UPI Collections, Inventory Assets, Receivables & Payables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
        {/* Collections Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Payment Receipts
          </span>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash
              </span>
              <span className="font-extrabold text-slate-900">₹{(kpis?.cashReceipts || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> UPI
              </span>
              <span className="font-extrabold text-slate-900">₹{(kpis?.upiReceipts || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Bank Transfer
              </span>
              <span className="font-extrabold text-slate-900">₹{(kpis?.bankReceipts || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Available Stock */}
        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Stock</span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">{kpis?.totalInventoryUnits || 0} units</div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Valued at ₹{(kpis?.totalInventoryValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Credit (A/R)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700">
              ₹{(kpis?.totalCustomerReceivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            <span>Outstanding customer balances</span>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealer Payables (A/P)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-700">
              ₹{(kpis?.totalSupplierPayables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            <span>Unpaid purchase order invoices</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gold-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-forest-800">{kpis?.lowStockAlertCount || 0}</div>
          <div className="mt-2 text-xs text-slate-500 font-medium">Products needing a stock review</div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales by Location */}
        <div className="bg-white p-6 rounded-3xl border border-gold-500/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Sales Analytics by Outlet</h3>
              <p className="text-xs text-slate-400 font-medium">Net revenue distributed across physical stores & pop-ups</p>
            </div>
            <Badge variant="success">Live Feed</Badge>
          </div>

          <div className="h-64">
            {data?.charts.salesByLocation && data.charts.salesByLocation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.salesByLocation} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6dcc4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#75643F' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#75643F' }} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Net Sales']}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid #e7d5ad', fontSize: '12px' }}
                  />
                  <Bar dataKey="netSales" fill="#263D2B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No location sales recorded for this period
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white p-6 rounded-3xl border border-gold-500/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Expenses Breakdown</h3>
              <p className="text-xs text-slate-400 font-medium">Categorized shop utilities, rent, packaging & overheads</p>
            </div>
            <button
              onClick={() => navigate('/admin/expenses')}
              className="text-xs font-bold text-pink-600 hover:text-pink-700"
            >
              View All &rarr;
            </button>
          </div>

          <div className="h-64">
            {data?.charts.expensesByCategory && data.charts.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.expensesByCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {data.charts.expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Amount']}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid #e7d5ad', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No operating expenses recorded for this period
              </div>
            )}
          </div>

        </div>

        <div className="bg-white p-6 rounded-3xl border border-gold-500/30 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">Recent Sales Trend</h3>
            <p className="text-xs text-slate-500 font-medium">Daily totals from the latest 200 posted invoices</p>
          </div>
          <div className="h-64">
            {salesAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6dcc4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#75643F' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#75643F' }} />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Net Sales']}
                    contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7d5ad', fontSize: '12px' }}
                  />
                  <Bar dataKey="netSales" fill="#B58A3E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                Posted sales will appear here.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gold-500/30 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">Monthly Sales</h3>
            <p className="text-xs text-slate-500 font-medium">Monthly totals from the latest 200 posted invoices</p>
          </div>
          <div className="h-64">
            {monthlySalesAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6dcc4" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#75643F' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#75643F' }} />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Net Sales']}
                    contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7d5ad', fontSize: '12px' }}
                  />
                  <Bar dataKey="netSales" fill="#49684E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                Posted sales will appear here.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-3xl border border-gold-500/30 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-forest-900">Recent Sales</h3>
              <p className="mt-1 text-xs text-slate-500">The latest transactions from your selected locations</p>
            </div>
            <button
              onClick={() => navigate('/admin/sales')}
              className="text-xs font-bold text-gold-700 hover:text-forest-800"
            >
              View ledger →
            </button>
          </div>
          {recentSalesError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{recentSalesError}</p>
          ) : recentSales.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentSales.slice(0, 6).map((sale) => (
                <div key={sale._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-forest-900">{sale.saleNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {sale.customerName || 'Walk-in Customer'} · {new Date(sale.saleDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-forest-800">
                    ₹{Number(sale.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">No sales recorded yet.</p>
          )}
        </section>

        <section className="rounded-3xl border border-gold-500/30 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-forest-900">Recent Purchases</h3>
              <p className="mt-1 text-xs text-slate-500">Latest stock receipts for your selected locations</p>
            </div>
            <button
              onClick={() => navigate('/admin/purchases')}
              className="text-xs font-bold text-gold-700 hover:text-forest-800"
            >
              View purchases →
            </button>
          </div>
          {recentPurchasesError ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {recentPurchasesError}
            </p>
          ) : recentPurchases.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentPurchases.map((purchase) => (
                <div key={purchase._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-forest-900">{purchase.invoiceNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {(typeof purchase.supplierId === 'object' && purchase.supplierId?.name) || 'Supplier'} ·{' '}
                      {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-forest-800">
                    ₹{Number(purchase.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">No purchases recorded yet.</p>
          )}
        </section>

        <section className="rounded-3xl border border-gold-500/30 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-forest-900">Best Selling Products</h3>
            <p className="mt-1 text-xs text-slate-500">Ranked by units in the latest 200 posted invoices</p>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map(([name, quantity], index) => {
                const maxQuantity = topProducts[0][1] || 1;
                return (
                  <div key={name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-semibold text-forest-800">
                        <span className="mr-2 text-gold-700">{String(index + 1).padStart(2, '0')}</span>
                        {name}
                      </span>
                      <span className="shrink-0 font-bold text-slate-600">{quantity} sold</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gold-50">
                      <div
                        className="h-full rounded-full bg-gold-500"
                        style={{ width: `${Math.max(8, (quantity / maxQuantity) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">Itemized sales will appear here as products are sold.</p>
          )}
        </section>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider">Quick Business Operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/staff/pos?mode=quick')}
            className="p-3 bg-pink-50 hover:bg-pink-100/80 text-pink-700 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-pink-200"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Mode A: Quick Sale</span>
          </button>
          <button
            onClick={() => navigate('/staff/pos?mode=product')}
            className="p-3 bg-purple-50 hover:bg-purple-100/80 text-purple-700 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-purple-200"
          >
            <Package className="w-5 h-5" />
            <span>Mode B: Product Sale</span>
          </button>
          <button
            onClick={() => navigate('/admin/purchases')}
            className="p-3 bg-blue-50 hover:bg-blue-100/80 text-blue-700 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-blue-200"
          >
            <Building className="w-5 h-5" />
            <span>Record Purchase</span>
          </button>
          <button
            onClick={() => navigate('/admin/reports')}
            className="p-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-extrabold border border-emerald-200"
          >
            <FileText className="w-5 h-5" />
            <span>View Full P&L</span>
          </button>
        </div>
      </div>
    </div>
  );
};
