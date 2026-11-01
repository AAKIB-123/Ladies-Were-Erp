import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Search, Store, Calendar, DollarSign, Filter, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

const CATEGORIES = [
  'Rent',
  'Transport',
  'Packaging',
  'Electricity',
  'Staff Salary',
  'Shop Supplies',
  'Repairs',
  'Marketing',
  'Other'
];

interface Expense {
  _id: string;
  expenseDate: string;
  category: string;
  amount: number;
  locationId?: { _id: string; name: string; code: string };
  paymentMethod: string;
  description: string;
  receiptNumber?: string;
  createdBy?: { name: string };
}

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [locationId, setLocationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { locations, selectedLocation } = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      let query = '/expenses';
      const params = new URLSearchParams();
      if (selectedLocation) {
        const locId = selectedLocation._id || selectedLocation.id;
        if (locId) params.append('locationId', locId);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      const queryString = params.toString();
      if (queryString) query += `?${queryString}`;

      const res = await api.get(query);
      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedLocation, selectedCategory]);

  const openAddModal = () => {
    setCategory(CATEGORIES[0]);
    setAmount('');
    const defaultLoc = selectedLocation ? (selectedLocation._id || selectedLocation.id || '') : '';
    setLocationId(defaultLoc);
    setPaymentMethod('cash');
    setDescription('');
    setReceiptNumber('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      showToast('Please enter a valid expense amount.', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter an expense description.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/expenses', {
        category,
        amount: val,
        locationId: locationId || undefined,
        paymentMethod,
        description: description.trim(),
        receiptNumber: receiptNumber.trim() || undefined
      });

      showToast('Expense recorded successfully', 'success');
      setIsModalOpen(false);
      await fetchExpenses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.receiptNumber && e.receiptNumber.toLowerCase().includes(search.toLowerCase())) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-pink-600" />
            Operating Expenses & Petty Cash
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Record rent, salaries, packaging, transport, and utilities with location allocation.
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Record Expense
        </Button>
      </div>

      {/* Filter and KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <Input
              placeholder="Search by description or receipt #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="bg-pink-50 border border-pink-200/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-pink-800 uppercase tracking-wider block">Period Expenses</span>
            <span className="text-2xl font-black text-pink-700">₹{totalExpenseSum.toFixed(2)}</span>
          </div>
          <Receipt className="w-8 h-8 text-pink-400" />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Method / Ref</th>
                <th className="py-3 px-4 font-black text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No expenses recorded for selected criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {exp.locationId?.name || (
                        <span className="text-slate-400 italic">Consolidated / Shared</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 uppercase font-mono text-[11px]">
                      {exp.paymentMethod} {exp.receiptNumber && `(#${exp.receiptNumber})`}
                    </td>
                    <td className="py-3.5 px-4 font-black text-rose-600 text-right text-sm">
                      ₹{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operating Expense"
        description="Enter petty cash, store overheads, or shared operating costs."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-pink-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Location (Optional)
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                <option value="">Consolidated / Shared Business</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white font-medium"
              >
                <option value="cash">Cash (Petty Cash)</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank_transfer">Bank Transfer / Card</option>
              </select>
            </div>
          </div>

          <Input
            label="Description / Purpose"
            required
            placeholder="e.g. Courier charges for Surat parcel, Staff chai & snacks"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Voucher / Receipt # (Optional)"
            placeholder="e.g. REC-987"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
