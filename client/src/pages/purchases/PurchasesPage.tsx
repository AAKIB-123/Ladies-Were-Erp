import React, { useState, useEffect } from 'react';
import { Plus, Package, Search, Truck, Store, Calendar, FileText, CheckCircle, ArrowDownCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

interface Purchase {
  _id: string;
  invoiceNumber: string;
  supplierId: { _id: string; name: string; contactPerson?: string; phone?: string };
  receivingLocationId: { _id: string; name: string; code: string };
  purchaseDate: string;
  totalAmount: number;
  amountPaid: number;
  outstandingPayable: number;
  paymentStatus: string;
  paymentMethod?: string;
  items: Array<{
    productId: any;
    variantId: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Purchase Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState<string>('0');
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; variantId: string; quantity: number; unitCost: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [purchasesRes, suppsRes, locsRes, prodsRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/locations?includeInactive=false'),
        api.get('/products')
      ]);

      if (purchasesRes.data.success) setPurchases(purchasesRes.data.purchases);
      if (suppsRes.data.success) setSuppliers(suppsRes.data.suppliers);
      if (locsRes.data.success) setLocations(locsRes.data.locations);
      if (prodsRes.data.success) setCatalog(prodsRes.data.products);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load purchase records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setSupplierId(suppliers[0]?._id || '');
    setLocationId(locations[0]?._id || '');
    setInvoiceNumber('');
    setAdditionalCosts('0');
    setAmountPaid('0');
    setPaymentMethod('bank_transfer');
    setNotes('');
    setLines([]);
    setIsModalOpen(true);
  };

  const addLine = (productId: string, variantId: string, defaultCost: number = 0) => {
    setLines((prev) => [
      ...prev,
      { productId, variantId, quantity: 1, unitCost: defaultCost }
    ]);
  };

  const updateLine = (idx: number, field: string, val: any) => {
    setLines((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculatedItemsTotal = lines.reduce(
    (sum, l) => sum + (l.quantity * l.unitCost),
    0
  );
  const totalInvoiceAmount = calculatedItemsTotal + (parseFloat(additionalCosts) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !supplierId || !locationId) {
      showToast('Please provide Invoice Number, Supplier, and Receiving Location.', 'error');
      return;
    }
    if (lines.length === 0) {
      showToast('Please add at least one product item to the purchase invoice.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/purchases', {
        invoiceNumber: invoiceNumber.trim(),
        supplierId,
        receivingLocationId: locationId,
        items: lines,
        additionalCosts: parseFloat(additionalCosts) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMethod,
        notes: notes.trim() || undefined
      });

      showToast('Purchase invoice posted & stock received into inventory!', 'success');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to post purchase invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) =>
    p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-pink-600" />
            Dealer Purchases & Landed Costs
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Receive wholesale stock, capitalize inventory assets, and auto-update Weighted Average Costs (WAC).
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Record Dealer Invoice
        </Button>
      </div>

      {/* Accounting Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
        <ArrowDownCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Accounting Rule:</span> Inventory purchases increase stock assets on the balance sheet and recalculate weighted-average cost. They are <strong>never</strong> expensed immediately into profit/loss until sold as COGS.
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="max-w-md">
          <Input
            placeholder="Search by invoice number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Supplier / Dealer</th>
                <th className="py-3 px-4">Received At</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Outstanding Payable</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No purchase invoices found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.supplierId?.name || 'Dealer'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {p.receivingLocationId?.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(p.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ₹{p.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ₹{p.amountPaid.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {p.outstandingPayable > 0 ? (
                        <span className="font-extrabold text-amber-700">
                          ₹{p.outstandingPayable.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          ₹0.00 (Settled)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success">Posted & Stocked</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post Dealer Purchase Invoice"
        description="Receive stock lines into inventory and update supplier ledger balance."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Supplier Invoice #"
              required
              placeholder="e.g. INV-SURAT-892"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Supplier / Dealer <span className="text-pink-600">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Receiving Store <span className="text-pink-600">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Quick Add */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Click Products to Add Lines:</span>
            <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 text-xs">
              {catalog.map((p) => (
                <div key={p._id} className="py-1.5 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{p.name} ({p.sku})</span>
                  <div className="flex gap-1">
                    {p.variants.map((v: any) => (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => addLine(p._id, v.variantId, v.currentCost || p.currentWeightedAverageCost)}
                        className="px-2 py-0.5 bg-white border border-slate-200 hover:border-pink-500 rounded font-bold text-[11px]"
                      >
                        + {v.colour || 'Std'} ({v.size || 'Free'})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-slate-200 rounded-2xl p-3 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Invoice Line Items:</span>
            {lines.length === 0 ? (
              <span className="text-xs text-slate-400 italic block py-4 text-center">
                No items added yet. Click variants above.
              </span>
            ) : (
              lines.map((l, idx) => {
                const prod = catalog.find((c) => c._id === l.productId);
                const v = prod?.variants.find((vr: any) => vr.variantId === l.variantId);
                return (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{prod?.name}</span>
                      <span className="text-[10px] text-slate-400">{v?.colour} • {v?.size}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value, 10))}
                        className="w-14 rounded-lg border border-slate-300 p-1 text-center font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">Unit Cost (₹):</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.unitCost}
                        onChange={(e) => updateLine(idx, 'unitCost', parseFloat(e.target.value))}
                        className="w-20 rounded-lg border border-slate-300 p-1 text-right font-bold"
                      />
                    </div>

                    <span className="font-extrabold text-slate-900 w-20 text-right">
                      ₹{(l.quantity * l.unitCost).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Landed costs & payment */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Additional Landed Costs (Freight ₹)"
              type="number"
              min="0"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
            />
            <Input
              label="Amount Paid to Supplier (₹)"
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="credit">Supplier Credit</option>
              </select>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 block">Total Invoice: <strong>₹{totalInvoiceAmount.toFixed(2)}</strong></span>
              <span className="text-amber-700 block font-bold">
                Outstanding Payable: ₹{Math.max(0, totalInvoiceAmount - (parseFloat(amountPaid) || 0)).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Post & Receive Stock
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
