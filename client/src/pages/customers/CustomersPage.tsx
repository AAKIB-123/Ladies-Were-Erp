import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, Edit2, Phone, MapPin, CreditCard } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/customers?search=${search}`);
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load customers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        });
        showToast('Customer details updated', 'success');
      } else {
        await api.post('/customers', {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim()
        });
        showToast('New customer created', 'success');
      }
      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save customer', 'error');
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
            <Users className="w-6 h-6 text-pink-600" />
            Customers & Clients
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Maintain regular client directories, mobile numbers, and credit balances.
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="max-w-md">
          <Input
            placeholder="Search by customer name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Outstanding Credit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No phone</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {c.address || <span className="text-slate-400 italic">No address</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.outstandingBalance > 0 ? (
                        <span className="font-extrabold text-rose-600 font-mono">
                          ₹{c.outstandingBalance.toFixed(2)} (Debit)
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 font-mono">
                          ₹0.00 (Clear)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit Customer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        description="Quick customer profile for billing and accounts receivable."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Customer Name"
            required
            placeholder="e.g. Anjali Deshmukh"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Mobile Number (Optional)"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Address (Optional)"
            placeholder="City, locality, or landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Preferences, Sizing, Measurements)
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="e.g., Prefers Kanjivaram silk, standard blouse size 38"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
