import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Building,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { Badge } from '../../components/common/Badge';
import { AppBrand } from '../../components/common/AppBrand';

interface PnLData {
  period: { startDate?: string; endDate?: string };
  locationId?: string;
  sales: {
    grossSales: number;
    totalDiscounts: number;
    totalSalesReturns: number;
    netSales: number;
    salesCount: number;
  };
  cogs: {
    confirmedCogs: number;
    returnCogsReversal: number;
    netCogs: number;
  };
  operatingExpenses: {
    total: number;
    expenseCount: number;
  };
  purchasesCapitalized: {
    totalAmount: number;
    count: number;
    note: string;
  };
  profit: {
    confirmedGrossProfit: number;
    confirmedNetProfit: number;
    isProvisional: boolean;
    unresolvedQuickSaleRevenue: number;
    unresolvedQuickSaleCount: number;
    provisionalGrossProfit: number;
    provisionalNetProfit: number;
    provisionalWarning: string | null;
  };
}

interface ValuationItem {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  variantId: string;
  variantName: string;
  size?: string;
  color?: string;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  unitCost: number;
  totalValuation: number;
}

interface ValuationData {
  locationId?: string;
  totalItems: number;
  totalUnits: number;
  totalValuation: number;
  items: ValuationItem[];
}

export const ReportsPage: React.FC = () => {
  const { selectedLocation, locations } = useLocation();
  const [activeTab, setActiveTab] = useState<'pnl' | 'valuation'>('pnl');

  // Filters for P&L
  const [period, setPeriod] = useState<string>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [filterLocationId, setFilterLocationId] = useState<string>('');

  // Data states
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (selectedLocation) {
      setFilterLocationId(selectedLocation._id);
    } else {
      setFilterLocationId('');
    }
  }, [selectedLocation]);

  const fetchPnL = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {};
      if (customStart || customEnd) {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      } else {
        params.period = period;
      }

      if (filterLocationId) {
        params.locationId = filterLocationId;
      }

      const res = await api.get('/reports/profit-loss', { params });
      if (res.data.success) {
        setPnlData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate P&L report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchValuation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {};
      if (filterLocationId) {
        params.locationId = filterLocationId;
      }

      const res = await api.get('/reports/valuation', { params });
      if (res.data.success) {
        setValuationData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate inventory valuation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pnl') {
      fetchPnL();
    } else {
      fetchValuation();
    }
  }, [activeTab, period, customStart, customEnd, filterLocationId]);

  const handlePrint = () => {
    window.print();
  };

  const filteredValuationItems = valuationData?.items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.variantName.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="mb-4 print:mb-5">
            <AppBrand compact />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial & Valuation Reports</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Official Accrual Profit & Loss statement and Weighted Average Costing (WAC) asset inventory reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'pnl'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Accrual Profit & Loss (P&L)</span>
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'valuation'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventory Valuation (WAC)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Selector */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Consolidated (All Branches)</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name} {loc.isActive ? '' : '(Deactivated)'}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'pnl' && (
            <>
              {/* Period Quick Select */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'all', label: 'All Time' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPeriod(item.id);
                      setCustomStart('');
                      setCustomEnd('');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      period === item.id && !customStart
                        ? 'bg-white text-pink-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
                />
              </div>
            </>
          )}

          {activeTab === 'valuation' && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 w-64 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}
        </div>

        <button
          onClick={activeTab === 'pnl' ? fetchPnL : fetchValuation}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          title="Refresh Report"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl font-semibold">
          {error}
        </div>
      )}

      {/* TAB 1: ACCRUAL PROFIT & LOSS */}
      {activeTab === 'pnl' && pnlData && (
        <div className="space-y-6">
          {/* Provisional Banner */}
          {pnlData.profit.isProvisional && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                  Provisional Profit & Loss Report
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 font-medium">
                  {pnlData.profit.provisionalWarning}
                </p>
                <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                  Accounting note: Revenue from unresolved Quick Sales is tracked separately and does not have verified product COGS. Reconcile those entries to publish final confirmed profit.
                </p>
              </div>
            </div>
          )}

          {/* Statement Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Sales Revenue</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                ₹{pnlData.sales.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                {pnlData.sales.salesCount} transactions recorded
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cost of Goods Sold (COGS)</span>
              <span className="text-2xl font-black text-slate-700 mt-2 block">
                ₹{pnlData.cogs.netCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Net cost of sold merchandise
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Confirmed Gross Profit</span>
              <span className="text-2xl font-black text-emerald-600 mt-2 block">
                ₹{pnlData.profit.confirmedGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-emerald-700 font-bold mt-1 block">
                {pnlData.sales.netSales > 0
                  ? ((pnlData.profit.confirmedGrossProfit / pnlData.sales.netSales) * 100).toFixed(1)
                  : '0.0'}% Gross Margin
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Confirmed Net Profit</span>
              <span className={`text-2xl font-black mt-2 block ${pnlData.profit.confirmedNetProfit >= 0 ? 'text-purple-700' : 'text-rose-600'}`}>
                ₹{pnlData.profit.confirmedNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-purple-700 font-bold mt-1 block">
                {pnlData.sales.netSales > 0
                  ? ((pnlData.profit.confirmedNetProfit / pnlData.sales.netSales) * 100).toFixed(1)
                  : '0.0'}% Net Margin
              </span>
            </div>
          </div>

          {/* Formal Accounting P&L Statement Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Statement of Profit & Loss</h3>
                <span className="text-xs text-slate-500 font-medium">Standard Accrual Basis Accounting</span>
              </div>
              <Badge variant="success">Certified Accrual</Badge>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Revenue */}
              <div className="p-4 bg-slate-50/40">
                <span className="font-black text-slate-900 uppercase tracking-wider">1. Operating Revenue</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8">
                <span className="text-slate-600 font-medium">Gross Merchandise Sales</span>
                <span className="font-bold text-slate-900">₹{pnlData.sales.grossSales.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8 text-rose-600">
                <span className="font-medium">Less: Customer Discounts</span>
                <span className="font-bold">-₹{pnlData.sales.totalDiscounts.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8 text-rose-600">
                <span className="font-medium">Less: Sales Returns & Customer Refunds</span>
                <span className="font-bold">-₹{pnlData.sales.totalSalesReturns.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between font-black bg-pink-50/50 text-pink-900">
                <span>NET SALES REVENUE</span>
                <span className="text-sm">₹{pnlData.sales.netSales.toFixed(2)}</span>
              </div>

              {/* COGS */}
              <div className="p-4 bg-slate-50/40">
                <span className="font-black text-slate-900 uppercase tracking-wider">2. Cost of Goods Sold (COGS)</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8">
                <span className="text-slate-600 font-medium">Confirmed Sold Items Cost (WAC Snapshot at Sale)</span>
                <span className="font-bold text-slate-900">₹{pnlData.cogs.confirmedCogs.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8 text-emerald-600">
                <span className="font-medium">Less: Restocked Returns Cost Reversal</span>
                <span className="font-bold">-₹{pnlData.cogs.returnCogsReversal.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between font-black bg-slate-100/60 text-slate-900">
                <span>NET COST OF GOODS SOLD</span>
                <span className="text-sm">₹{pnlData.cogs.netCogs.toFixed(2)}</span>
              </div>

              {/* GROSS PROFIT */}
              <div className="px-6 py-4 flex items-center justify-between font-black bg-emerald-50 text-emerald-950 text-sm">
                <span>CONFIRMED GROSS PROFIT (Net Sales - Net COGS)</span>
                <span>₹{pnlData.profit.confirmedGrossProfit.toFixed(2)}</span>
              </div>

              {/* OPERATING EXPENSES */}
              <div className="p-4 bg-slate-50/40">
                <span className="font-black text-slate-900 uppercase tracking-wider">3. Operating Expenses</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between pl-8 text-slate-700">
                <span className="font-medium">Business Overheads (Rent, Salaries, Utilities, Packaging, Logistics)</span>
                <span className="font-bold text-rose-600">-₹{pnlData.operatingExpenses.total.toFixed(2)}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between font-black bg-slate-100/60 text-slate-900">
                <span>TOTAL OPERATING EXPENSES</span>
                <span className="text-sm">₹{pnlData.operatingExpenses.total.toFixed(2)}</span>
              </div>

              {/* NET PROFIT */}
              <div className="px-6 py-5 flex items-center justify-between font-black bg-purple-50 text-purple-950 text-base">
                <div>
                  <span>CONFIRMED NET PROFIT</span>
                  <p className="text-[11px] font-medium text-purple-700">Gross Profit minus Business Operating Expenses</p>
                </div>
                <span className="text-xl">₹{pnlData.profit.confirmedNetProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* Accounting Footnote: Capitalization of Inventory Assets */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">
                  Balance Sheet Capitalization Note (Purchases in Period: ₹{pnlData.purchasesCapitalized.totalAmount.toFixed(2)})
                </p>
                <p className="text-slate-500">
                  {pnlData.purchasesCapitalized.note} Only the cost of merchandise actually sold is recognized as an expense (COGS) in this period. Unsold merchandise remains capitalized as current assets on the business balance sheet.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY VALUATION REPORT */}
      {activeTab === 'valuation' && valuationData && (
        <div className="space-y-6">
          {/* Valuation Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Inventory Value (Asset)</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                ₹{valuationData.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Valued at current Weighted Average Cost (WAC)
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Units in Stock</span>
              <span className="text-2xl font-black text-blue-600 mt-2 block">
                {valuationData.totalUnits.toLocaleString('en-IN')} Units
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Physical garments available across selected outlets
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Distinct Variant SKUs</span>
              <span className="text-2xl font-black text-purple-600 mt-2 block">
                {valuationData.totalItems} Items
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Tracked size/colour catalog combinations
              </span>
            </div>
          </div>

          {/* Valuation Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Itemized Stock on Hand & Asset Valuation</h3>
                <span className="text-xs text-slate-500 font-medium">Single source of truth for stock assets</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Showing {filteredValuationItems.length} of {valuationData.totalItems} items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Variant (Size/Colour)</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Qty on Hand</th>
                    <th className="py-3 px-4 text-right">WAC Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Asset Value</th>
                    <th className="py-3 px-4 text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredValuationItems.length > 0 ? (
                    filteredValuationItems.map((item) => (
                      <tr key={item.inventoryId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.sku}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.productName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600 font-semibold">
                            {item.variantName || 'Standard'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{item.locationName}</td>
                        <td className="py-3 px-4 text-center font-black text-slate-900">
                          {item.quantityOnHand}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          ₹{item.unitCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          ₹{item.totalValuation.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.quantityOnHand === 0 ? (
                            <Badge variant="danger">Out of Stock</Badge>
                          ) : item.quantityOnHand <= 2 ? (
                            <Badge variant="warning">Low Stock</Badge>
                          ) : (
                            <Badge variant="success">In Stock</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        No inventory records match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
