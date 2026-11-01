import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  History,
  Search,
  Plus,
  Store,
  Layers,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import api from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'transfers' | 'movements'>('stock');
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [sourceLocId, setSourceLocId] = useState('');
  const [destLocId, setDestLocId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLines, setTransferLines] = useState<Array<{ productId: string; variantId: string; quantity: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { locations, selectedLocation } = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      let query = '/inventory';
      if (selectedLocation) {
        query += `?locationId=${selectedLocation._id || selectedLocation.id}`;
      }
      const res = await api.get(query);
      if (res.data.success) {
        setInventoryList(res.data.inventory);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/inventory/transfers');
      if (res.data.success) {
        setTransfers(res.data.transfers);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load transfers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/inventory/movements');
      if (res.data.success) {
        setMovements(res.data.movements);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load movements', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stock') fetchStock();
    else if (activeTab === 'transfers') fetchTransfers();
    else if (activeTab === 'movements') fetchMovements();
  }, [activeTab, selectedLocation]);

  const openTransferModal = () => {
    const locs = locations.filter((l) => l.isActive);
    setSourceLocId(locs[0]?._id || '');
    setDestLocId(locs[1]?._id || '');
    setTransferNotes('');
    setTransferLines([]);
    setIsTransferModalOpen(true);
  };

  const addTransferItem = (item: any) => {
    setTransferLines((prev) => [
      ...prev,
      { productId: item.productId, variantId: item.variantId, quantity: 1 }
    ]);
  };

  const updateTransferQty = (idx: number, qty: number) => {
    setTransferLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, quantity: Math.max(1, qty) } : l))
    );
  };

  const removeTransferItem = (idx: number) => {
    setTransferLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocId || !destLocId) {
      showToast('Please select source and destination stores.', 'error');
      return;
    }
    if (sourceLocId === destLocId) {
      showToast('Source and destination locations cannot be identical.', 'error');
      return;
    }
    if (transferLines.length === 0) {
      showToast('Please add at least one item to transfer.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/inventory/transfers', {
        sourceLocationId: sourceLocId,
        destinationLocationId: destLocId,
        items: transferLines,
        notes: transferNotes.trim() || undefined
      });

      showToast('Stock transferred successfully! Inventory balances updated.', 'success');
      setIsTransferModalOpen(false);
      await fetchStock();
      if (activeTab === 'transfers') await fetchTransfers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to transfer stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStock = inventoryList.filter(
    (item) =>
      item.productName?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.colour?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-pink-600" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time stock on hand per variant, inter-branch transfers, and audit movement ledger.
          </p>
        </div>
        <Button onClick={openTransferModal} variant="primary" icon={<ArrowRightLeft className="w-4 h-4" />}>
          New Stock Transfer
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === 'stock'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock on Hand</span>
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === 'transfers'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Stock Transfers</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'movements'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Movement Audit Ledger</span>
          </button>
        )}
      </div>

      {/* TAB 1: STOCK ON HAND */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="max-w-md">
              <Input
                placeholder="Search stock by SKU, product name, or colour..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Variant (Size / Colour)</th>
                    <th className="py-3 px-4">Store Location</th>
                    <th className="py-3 px-4">Stock on Hand</th>
                    {isAdmin && <th className="py-3 px-4">Avg Cost</th>}
                    {isAdmin && <th className="py-3 px-4">Total Stock Value</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className="py-8 text-center text-slate-400 font-medium">
                        Loading inventory records...
                      </td>
                    </tr>
                  ) : filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className="py-8 text-center text-slate-400 font-medium">
                        No inventory records found for selected location.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {inv.sku}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {inv.productName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700">
                            {inv.colour} • {inv.size}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {inv.location?.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-black text-sm px-2.5 py-0.5 rounded-full ${
                              inv.quantityOnHand <= 2
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {inv.quantityOnHand} pcs
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                            ₹{(inv.unitCost || 0).toFixed(2)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                            ₹{(inv.totalValue || 0).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">From Store</th>
                  <th className="py-3 px-4">To Store</th>
                  <th className="py-3 px-4">Items Transferred</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Loading stock transfers...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No stock transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {t.transferNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {t.sourceLocationId?.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-pink-700">
                        {t.destinationLocationId?.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {t.items?.reduce((s: number, i: any) => s + i.quantity, 0)} units
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">Completed</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MOVEMENTS AUDIT LEDGER */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Unit Cost Snapshot</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      Loading movements ledger...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No stock movements recorded.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {m.locationId?.name}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {m.productId?.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {m.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono">
                        <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        ₹{(m.unitCost || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {m.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Inter-Branch Stock Transfer"
        description="Transfer stock between outlets without modifying overall business valuation."
        maxWidth="xl"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                From Source Store <span className="text-pink-600">*</span>
              </label>
              <select
                value={sourceLocId}
                onChange={(e) => setSourceLocId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                To Destination Store <span className="text-pink-600">*</span>
              </label>
              <select
                value={destLocId}
                onChange={(e) => setDestLocId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick select items from current stock */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Click Available Stock to Transfer:</span>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
              {inventoryList
                .filter((inv) => (inv.location?._id || inv.location?.id) === sourceLocId && inv.quantityOnHand > 0)
                .map((inv) => (
                  <div key={inv._id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{inv.productName}</span>
                      <span className="text-slate-400 ml-1.5">({inv.colour} • {inv.size})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700">Avail: {inv.quantityOnHand}</span>
                      <button
                        type="button"
                        onClick={() => addTransferItem(inv)}
                        className="px-2 py-0.5 bg-pink-600 text-white rounded font-bold text-[11px]"
                      >
                        + Select
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Transfer Lines */}
          <div className="border border-slate-200 rounded-2xl p-3 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Items Scheduled for Transfer:</span>
            {transferLines.length === 0 ? (
              <span className="text-xs text-slate-400 italic block py-4 text-center">
                No items added. Click available items above.
              </span>
            ) : (
              transferLines.map((line, idx) => {
                const stockItem = inventoryList.find((i) => i.productId === line.productId && i.variantId === line.variantId);
                return (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block">{stockItem?.productName || 'Product'}</span>
                      <span className="text-[10px] text-slate-400">{stockItem?.colour} • {stockItem?.size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Transfer Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max={stockItem?.quantityOnHand || 999}
                        value={line.quantity}
                        onChange={(e) => updateTransferQty(idx, parseInt(e.target.value, 10))}
                        className="w-16 rounded border border-slate-300 p-1 text-center font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTransferItem(idx)}
                      className="text-slate-400 hover:text-rose-600 ml-3"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <Input
            label="Transfer Notes (Optional)"
            placeholder="e.g. Stock replenished for upcoming festive weekend"
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={transferLines.length === 0}
              isLoading={isSubmitting}
            >
              Confirm Inter-Branch Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
