import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, UserCheck, Truck, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

interface Payment {
  _id: string;
  paymentNumber: string;
  paymentType: string;
  partyType: string;
  partyId?: any;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  locationId?: { name: string };
}

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Collection / Payout Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'collection' | 'payout'>('collection');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let query = '/payments';
      if (typeFilter) query += `?paymentType=${typeFilter}`;

      const [paymentsRes, custsRes, suppsRes] = await Promise.all([
        api.get(query),
        api.get('/customers'),
        isAdmin ? api.get('/suppliers') : Promise.resolve({ data: { success: true, suppliers: [] } })
      ]);

      if (paymentsRes.data.success) setPayments(paymentsRes.data.payments);
      if (custsRes.data.success) setCustomers(custsRes.data.customers);
      if (suppsRes.data.success) setSuppliers(suppsRes.data.suppliers);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load payments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const openCollectionModal = () => {
    setModalMode('collection');
    setSelectedPartyId(customers[0]?._id || '');
    setAmount('');
    setPaymentMethod('upi');
    setReferenceNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openPayoutModal = () => {
    setModalMode('payout');
    setSelectedPartyId(suppliers[0]?._id || '');
    setAmount('');
    setPaymentMethod('bank_transfer');
    setReferenceNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    if (!selectedPartyId) {
      showToast('Please select a party for this transaction.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/payments', {
        paymentType: modalMode === 'collection' ? 'customer_collection' : 'supplier_payment',
        partyType: modalMode === 'collection' ? 'customer' : 'supplier',
        partyId: selectedPartyId,
        amount: val,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined
      });

      showToast(
        modalMode === 'collection'
          ? 'Customer payment collection recorded and credit balance reduced!'
          : 'Supplier payment recorded and payable balance updated!',
        'success'
      );
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-pink-600" />
            Payments & Collections Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track customer receivables, credit collections, dealer payouts, and petty cash settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCollectionModal} variant="primary" icon={<ArrowDownLeft className="w-4 h-4" />}>
            Collect Payment
          </Button>
          {isAdmin && (
            <Button onClick={openPayoutModal} variant="outline" icon={<ArrowUpRight className="w-4 h-4" />}>
              Pay Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter By Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="">All Transactions</option>
            <option value="customer_collection">Customer Collections (AR Inflow)</option>
            <option value="supplier_payment">Supplier Payouts (AP Outflow)</option>
            <option value="customer_refund">Customer Refunds</option>
            <option value="expense">Expense Payouts</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Method / Ref</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isIncoming = p.paymentType === 'customer_collection' || p.paymentType === 'customer_sale';
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isIncoming
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.paymentType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {p.partyType === 'customer' ? 'Customer' : p.partyType === 'supplier' ? 'Supplier' : 'Direct'}
                      </td>
                      <td className="py-3.5 px-4 font-mono uppercase text-slate-600">
                        {p.paymentMethod} {p.referenceNumber && `(${p.referenceNumber})`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {p.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-sm">
                        <span className={isIncoming ? 'text-emerald-700' : 'text-slate-900'}>
                          {isIncoming ? '+' : '-'}₹{p.amount.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'collection' ? 'Record Customer Payment Collection' : 'Record Supplier Payout'}
        description={
          modalMode === 'collection'
            ? 'Collect outstanding credit balance from a retail customer.'
            : 'Record payment made to a wholesale fabric dealer to reduce payables.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {modalMode === 'collection' ? 'Select Customer' : 'Select Supplier'} <span className="text-pink-600">*</span>
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
            >
              {modalMode === 'collection'
                ? customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — Bal: ₹{c.outstandingBalance.toFixed(2)}
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} — Payable: ₹{s.outstandingPayable.toFixed(2)}
                    </option>
                  ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <Input
            label="Transaction Reference / Cheque #"
            placeholder="e.g. UTR-987654321"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />

          <Input
            label="Notes"
            placeholder="e.g. Cleared Diwali festival advance balance"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {modalMode === 'collection' ? 'Confirm Collection' : 'Confirm Payout'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
