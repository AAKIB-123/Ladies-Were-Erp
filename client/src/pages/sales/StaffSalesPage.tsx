import React, { useState, useEffect } from 'react';
import {
  Zap,
  ScanBarcode,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  CreditCard,
  DollarSign,
  Smartphone,
  Printer,
  X,
  Store,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { AppBrand } from '../../components/common/AppBrand';

interface ProductItem {
  _id: string;
  sku: string;
  name: string;
  category: string;
  defaultPrice: number;
  variants: Array<{
    variantId: string;
    size?: string;
    colour?: string;
    defaultPrice?: number;
  }>;
}

interface CartLine {
  productId: string;
  variantId: string;
  name: string;
  size?: string;
  colour?: string;
  unitPrice: number;
  quantity: number;
  lineDiscount: number;
}

export const StaffSalesPage: React.FC = () => {
  const { selectedLocation } = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Mode: 'quick' | 'product_wise'
  const [saleMode, setSaleMode] = useState<'quick' | 'product_wise'>('quick');

  // Quick Sale State
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickDiscount, setQuickDiscount] = useState<string>('');
  const [quickCustomer, setQuickCustomer] = useState<string>('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'credit'>('upi');
  const [quickNotes, setQuickNotes] = useState<string>('');

  // Product-Wise Sale State
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<string>('');
  const [pwPaymentMethod, setPwPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'credit'>('cash');
  const [pwCustomer, setPwCustomer] = useState<string>('');
  const [pwNotes, setPwNotes] = useState<string>('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch catalog for itemized search
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get('/products');
        if (res.data.success) {
          setAvailableProducts(res.data.products);
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    };
    fetchCatalog();
  }, []);

  // Quick Sale Handler
  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      showToast('Please select an active location first.', 'error');
      return;
    }

    const amount = parseFloat(quickAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid sale amount.', 'error');
      return;
    }

    const discount = parseFloat(quickDiscount) || 0;
    const net = Math.max(0, amount - discount);

    try {
      setIsSubmitting(true);
      const res = await api.post('/sales', {
        saleMode: 'quick',
        locationId: selectedLocation._id || selectedLocation.id,
        totalAmount: amount,
        discount,
        customerName: quickCustomer.trim() || 'Walk-in Customer',
        paymentMethod: quickPaymentMethod,
        amountReceived: net,
        notes: quickNotes.trim() || undefined,
        idempotencyKey: `QS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      });

      if (res.data.success) {
        showToast('Quick Sale recorded successfully!', 'success');
        setCompletedSale(res.data.sale);
        setIsReceiptOpen(true);
        // Reset form
        setQuickAmount('');
        setQuickDiscount('');
        setQuickCustomer('');
        setQuickNotes('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record Quick Sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Item to Cart
  const addToCart = (product: ProductItem, variant: any) => {
    const existingIndex = cart.findIndex(
      (c) => c.productId === product._id && c.variantId === variant.variantId
    );

    const price = variant.defaultPrice || product.defaultPrice;

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product._id,
          variantId: variant.variantId,
          name: product.name,
          size: variant.size,
          colour: variant.colour,
          unitPrice: price,
          quantity: 1,
          lineDiscount: 0
        }
      ]);
    }
    showToast(`Added ${product.name} (${variant.colour || ''} ${variant.size || ''})`, 'info');
  };

  const updateCartQty = (index: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      const updated = [...cart];
      updated[index].quantity = qty;
      setCart(updated);
    }
  };

  const updateCartLineDiscount = (index: number, disc: number) => {
    const updated = [...cart];
    updated[index].lineDiscount = Math.max(0, disc);
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Cart Calculations
  const cartGross = cart.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice - item.lineDiscount),
    0
  );
  const cartOverallDisc = parseFloat(overallDiscount) || 0;
  const cartNet = Math.max(0, cartGross - cartOverallDisc);

  const printReceipt = () => {
    const cleanup = () => document.body.classList.remove('printing-receipt');
    document.body.classList.add('printing-receipt');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  // Product-Wise Sale Submit
  const handleProductWiseSubmit = async () => {
    if (!selectedLocation) {
      showToast('Please select an active location first.', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Please add at least one product to the sale.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/sales', {
        saleMode: 'product_wise',
        locationId: selectedLocation._id || selectedLocation.id,
        customerName: pwCustomer.trim() || 'Walk-in Customer',
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          lineDiscount: c.lineDiscount
        })),
        overallDiscount: cartOverallDisc,
        paymentMethod: pwPaymentMethod,
        amountReceived: cartNet,
        notes: pwNotes.trim() || undefined,
        idempotencyKey: `PW-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      });

      if (res.data.success) {
        showToast('Itemized Sale completed and stock deducted!', 'success');
        setCompletedSale(res.data.sale);
        setIsReceiptOpen(true);
        // Reset Cart
        setCart([]);
        setOverallDiscount('');
        setPwCustomer('');
        setPwNotes('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to complete sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sales Point Header */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Terminal Location</span>
            <span className="text-sm font-extrabold text-slate-900">{selectedLocation?.name || 'Loading Store...'}</span>
          </div>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setSaleMode('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              saleMode === 'quick'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Mode A: Quick</span>
          </button>
          <button
            onClick={() => setSaleMode('product_wise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              saleMode === 'product_wise'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>Mode B: Itemized</span>
          </button>
        </div>
      </div>

      {/* MODE A: QUICK SALE */}
      {saleMode === 'quick' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-pink-600" />
                Quick Sale Entry
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Instant billing for rush hours. Inventory reconciled later by owner.
              </p>
            </div>
            <Badge variant="provisional">Provisional</Badge>
          </div>

          <form onSubmit={handleQuickSaleSubmit} className="space-y-5">
            {/* Amount Field (Large Touch Target) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Total Sale Amount (₹) <span className="text-pink-600">*</span>
              </label>
              <div className="relative rounded-2xl shadow-inner bg-slate-50 border-2 border-pink-200 focus-within:border-pink-600 focus-within:bg-white transition-all">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xl font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 text-2xl font-black text-slate-900 bg-transparent focus:outline-none rounded-2xl"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Customer & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Customer Name / Mobile"
                placeholder="Walk-in or 98765..."
                value={quickCustomer}
                onChange={(e) => setQuickCustomer(e.target.value)}
              />
              <Input
                label="Discount (₹)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={quickDiscount}
                onChange={(e) => setQuickDiscount(e.target.value)}
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Payment Method <span className="text-pink-600">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'bank_transfer', label: 'Card / Bank', icon: CreditCard },
                  { id: 'credit', label: 'Credit', icon: Store }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setQuickPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                      quickPaymentMethod === m.id
                        ? 'border-pink-600 bg-pink-50 text-pink-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <m.icon className="w-5 h-5 mb-1" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <Input
              label="Notes (Optional)"
              placeholder="e.g. 2 Sarees bought, blue blouse"
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
            />

            {/* Net Total Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Payable</span>
              <span className="text-2xl font-black text-pink-600">
                ₹{(Math.max(0, (parseFloat(quickAmount) || 0) - (parseFloat(quickDiscount) || 0))).toFixed(2)}
              </span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-lg shadow-pink-600/30 font-black text-base py-4 rounded-2xl"
              isLoading={isSubmitting}
            >
              Confirm Quick Sale
            </Button>
          </form>
        </div>
      )}

      {/* MODE B: PRODUCT-WISE SALE */}
      {saleMode === 'product_wise' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Product Search & Catalog List (Left 7 Columns) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <Input
                placeholder="Search products by SKU, name, or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 max-h-[600px] overflow-y-auto space-y-2.5">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No matching items found.
                </div>
              ) : (
                filteredCatalog.map((p) => (
                  <div
                    key={p._id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-pink-200 hover:bg-pink-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{p.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Default Price: <span className="font-bold text-slate-800">₹{p.defaultPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Variant Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.variants.map((v) => (
                        <button
                          key={v.variantId}
                          onClick={() => addToCart(p, v)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-pink-600 hover:text-white rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 border border-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{v.colour || 'Std'} ({v.size || 'Free'})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Sale Order Cart (Right 5 Columns) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Current Cart</h3>
                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Cart Items List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2 space-y-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Cart is empty. Select products from catalog.
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-xs truncate block">{item.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.colour} • {item.size} @ ₹{item.unitPrice}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(idx, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(idx, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="text-xs font-extrabold text-slate-900 w-16 text-right">
                        ₹{(item.quantity * item.unitPrice - item.lineDiscount).toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Checkout Controls */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Customer (Optional)"
                  placeholder="Walk-in..."
                  value={pwCustomer}
                  onChange={(e) => setPwCustomer(e.target.value)}
                />
                <Input
                  label="Discount (₹)"
                  type="number"
                  placeholder="0.00"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['cash', 'upi', 'bank_transfer', 'credit'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPwPaymentMethod(method as any)}
                      className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        pwPaymentMethod === method
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Total */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Net Total</span>
                <span className="text-2xl font-black text-pink-600">₹{cartNet.toFixed(2)}</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={cart.length === 0}
                isLoading={isSubmitting}
                onClick={handleProductWiseSubmit}
                className="w-full font-black text-base py-3.5 rounded-2xl shadow-lg shadow-pink-600/30"
              >
                Complete Itemized Sale
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Sale Recorded Successfully"
        description="Transaction completed and logged in ledger."
        maxWidth="md"
      >
        {completedSale && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-emerald-900 block text-sm">
                  Invoice {completedSale.saleNumber}
                </span>
                <span className="text-xs text-emerald-700">
                  Total Paid: ₹{completedSale.netAmount?.toFixed(2)} via {completedSale.paymentMethod?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Printable summary */}
            <div className="receipt-print p-5 rounded-xl border border-gold-500/50 font-mono text-xs space-y-2 bg-white">
              <div className="flex justify-center border-b border-gold-500/30 pb-3">
                <AppBrand />
              </div>
              <div className="text-center text-[11px] font-medium text-slate-600">
                {selectedLocation?.name || 'Store'} · Ladies Wear
              </div>
              <div className="border-b border-gold-500/30 py-2 flex justify-between text-slate-600">
                <span>Inv: {completedSale.saleNumber}</span>
                <span>{new Date(completedSale.saleDate).toLocaleDateString()}</span>
              </div>
              {completedSale.customerName && (
                <div className="flex justify-between text-slate-600">
                  <span>Customer</span>
                  <span>{completedSale.customerName}</span>
                </div>
              )}
              {completedSale.items?.length > 0 && (
                <div className="space-y-1 border-b border-gold-500/30 py-2">
                  {completedSale.items.map((item: any, index: number) => (
                    <div key={`${item.productName}-${index}`} className="flex justify-between gap-3 text-slate-600">
                      <span className="min-w-0 truncate">{item.productName} × {item.quantity}</span>
                      <span className="shrink-0">₹{Number(item.lineTotal || item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 text-sm pt-1">
                <span>NET TOTAL:</span>
                <span>₹{completedSale.netAmount?.toFixed(2)}</span>
              </div>
              <div className="text-center text-[10px] text-slate-500 pt-2">
                Thank you for shopping with us!
              </div>
            </div>

            <div className="receipt-actions flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={printReceipt}
              >
                Print Receipt
              </Button>
              <Button variant="primary" onClick={() => setIsReceiptOpen(false)}>
                Done (Next Sale)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
