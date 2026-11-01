import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Zap,
  ScanBarcode,
  Eye,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

interface Sale {
  _id: string;
  saleNumber: string;
  locationId: { _id: string; name: string; code: string };
  customerName?: string;
  saleMode: 'quick' | 'product_wise';
  saleDate: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  totalCogs?: number;
  paymentMethod: string;
  paymentStatus: string;
  amountReceived: number;
  isReconciled: boolean;
  notes?: string;
  items: Array<{
    productName: string;
    size?: string;
    colour?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export const SalesHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [reconciledFilter, setReconciledFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Sale Details Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reconciliation Modal (Admin)
  const [reconcilingSale, setReconcilingSale] = useState<Sale | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [reconcileItems, setReconcileItems] = useState<Array<{ productId: string; variantId: string; quantity: number }>>([]);
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  const { selectedLocation } = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      let query = `/sales?search=${search}`;
      if (selectedLocation) {
        query += `&locationId=${selectedLocation._id || selectedLocation.id}`;
      }
      if (modeFilter) query += `&saleMode=${modeFilter}`;
      if (reconciledFilter) query += `&isReconciled=${reconciledFilter}`;

      const res = await api.get(query);
      if (res.data.success) {
        setSales(res.data.sales);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch sales history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedLocation, modeFilter, reconciledFilter]);

  const openSaleDetail = (s: Sale) => {
    setSelectedSale(s);
    setIsDetailOpen(true);
  };

  const openReconcileModal = async (s: Sale) => {
    setReconcilingSale(s);
    setReconcileNotes('');
    setReconcileItems([]);
    try {
      const res = await api.get('/products');
      if (res.data.success) {
        setCatalog(res.data.products);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReconcileItem = (productId: string, variantId: string) => {
    setReconcileItems((prev) => [...prev, { productId, variantId, quantity: 1 }]);
  };

  const handleUpdateReconcileQty = (idx: number, qty: number) => {
    setReconcileItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const handleRemoveReconcileItem = (idx: number) => {
    setReconcileItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitReconciliation = async () => {
    if (!reconcilingSale) return;
    if (reconcileItems.length === 0) {
      showToast('Please add at least one product item to reconcile this sale.', 'error');
      return;
    }

    try {
      setIsReconciling(true);
      const res = await api.post(`/sales/${reconcilingSale._id}/reconcile`, {
        items: reconcileItems,
        notes: reconcileNotes
      });

      if (res.data.success) {
        showToast('Quick Sale reconciled with stock inventory!', 'success');
        setReconcilingSale(null);
        await fetchSales();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reconcile sale', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-pink-600" />
            Sales Transactions & Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Complete transaction history with dual-mode tracking and reconciliation audit.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="quick">Quick Sale (Mode A)</option>
            <option value="product_wise">Itemized (Mode B)</option>
          </select>

          {isAdmin && (
            <select
              value={reconciledFilter}
              onChange={(e) => setReconciledFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="">All Reconciled Status</option>
              <option value="false">Pending Reconciliation</option>
              <option value="true">Reconciled / Confirmed</option>
            </select>
          )}

          <Button variant="outline" size="sm" onClick={fetchSales}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Net Amount</th>
                <th className="py-3 px-4">Reconciliation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No sales records found.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.saleNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(s.saleDate).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {s.locationId?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {s.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.saleMode === 'quick' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                          <Zap className="w-3 h-3 text-amber-600" /> Quick
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                          <ScanBarcode className="w-3 h-3 text-purple-600" /> Itemized
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      ₹{s.netAmount.toFixed(2)}
                      <span className="block text-[10px] font-normal text-slate-400 uppercase">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.isReconciled ? (
                        <Badge variant="success">Reconciled</Badge>
                      ) : (
                        <Badge variant="provisional">Pending Reconciliation</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openSaleDetail(s)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && !s.isReconciled && (
                          <button
                            onClick={() => openReconcileModal(s)}
                            className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-lg text-[11px] border border-pink-200 flex items-center gap-1"
                          >
                            <span>Reconcile</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Invoice ${selectedSale?.saleNumber || ''}`}
        description="Complete breakdown of items, payments, and margin accounting."
        maxWidth="lg"
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                <span className="font-semibold text-slate-800">{new Date(selectedSale.saleDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                <span className="font-semibold text-slate-800">{selectedSale.locationId?.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <span className="font-semibold text-slate-800">{selectedSale.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className="font-bold text-emerald-700 capitalize">{selectedSale.paymentStatus}</span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider block mb-2">Line Items</span>
              {selectedSale.items && selectedSale.items.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                        <span className="text-slate-400 text-[11px]">
                          {item.colour || ''} {item.size || ''} • Qty: {item.quantity} × ₹{item.unitPrice}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900">
                        ₹{item.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                  Quick Sale recorded without itemization. Awaiting inventory reconciliation.
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Gross Amount:</span>
                <span>₹{selectedSale.grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discounts:</span>
                <span>-₹{selectedSale.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Net Amount:</span>
                <span className="text-pink-600">₹{selectedSale.netAmount.toFixed(2)}</span>
              </div>
              {isAdmin && selectedSale.totalCogs !== undefined && (
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>COGS Snapshot:</span>
                  <span>₹{selectedSale.totalCogs.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Quick Sale Reconciliation Modal */}
      <Modal
        isOpen={!!reconcilingSale}
        onClose={() => setReconcilingSale(null)}
        title={`Reconcile Quick Sale: ${reconcilingSale?.saleNumber || ''}`}
        description="Select the products and variants sold so stock can be deducted and COGS calculated."
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs text-pink-900 flex items-center justify-between">
            <span>Original Sale Revenue: <strong className="text-pink-700">₹{reconcilingSale?.netAmount.toFixed(2)}</strong></span>
            <span>Recorded At: <strong>{reconcilingSale?.locationId?.name}</strong></span>
          </div>

          {/* Product selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Available Catalog to Add:</span>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 divide-y divide-slate-100 text-xs">
              {catalog.map((p) => (
                <div key={p._id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-slate-400 font-mono ml-2">({p.sku})</span>
                  </div>
                  <div className="flex gap-1">
                    {p.variants.map((v: any) => (
                      <button
                        key={v.variantId}
                        onClick={() => handleAddReconcileItem(p._id, v.variantId)}
                        className="px-2 py-1 bg-slate-100 hover:bg-pink-600 hover:text-white rounded text-[11px] font-bold"
                      >
                        + {v.colour || 'Std'} ({v.size || 'Free'})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Reconcile Lines */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Allocated Items to Deduct:</span>
            <div className="border border-slate-200 rounded-xl p-3 min-h-[100px] space-y-2">
              {reconcileItems.length === 0 ? (
                <span className="text-xs text-slate-400 italic block text-center py-4">
                  No items added yet. Click variants above to allocate.
                </span>
              ) : (
                reconcileItems.map((item, idx) => {
                  const prod = catalog.find((c) => c._id === item.productId);
                  const v = prod?.variants.find((vr: any) => vr.variantId === item.variantId);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2 rounded-lg">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block">{prod?.name}</span>
                        <span className="text-[10px] text-slate-400">{v?.colour} • {v?.size}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateReconcileQty(idx, parseInt(e.target.value, 10))}
                          className="w-14 rounded border border-slate-300 p-1 text-center font-bold"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveReconcileItem(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Input
            label="Reconciliation Notes (Optional)"
            placeholder="e.g. Verified with paper sales slip"
            value={reconcileNotes}
            onChange={(e) => setReconcileNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setReconcilingSale(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={reconcileItems.length === 0}
              isLoading={isReconciling}
              onClick={handleSubmitReconciliation}
            >
              Confirm Reconciliation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
