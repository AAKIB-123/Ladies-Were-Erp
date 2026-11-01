import React, { useState, useEffect } from 'react';
import { Plus, Truck, Search, Edit2, Phone, Mail, MapPin } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  outstandingPayable: number;
  isActive: boolean;
  createdAt: string;
}

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/suppliers?search=${search}`);
      if (res.data.success) {
        setSuppliers(res.data.suppliers);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load suppliers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, {
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          notes: notes.trim()
        });
        showToast('Supplier updated successfully', 'success');
      } else {
        await api.post('/suppliers', {
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          notes: notes.trim()
        });
        showToast('New dealer/supplier added', 'success');
      }
      setIsModalOpen(false);
      await fetchSuppliers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
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
            <Truck className="w-6 h-6 text-pink-600" />
            Suppliers & Fabric Dealers
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track cloth wholesalers, mills, invoice payables, and purchase ledgers.
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="max-w-md">
          <Input
            placeholder="Search dealers by name, contact, or phone..."
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
                <th className="py-3 px-4">Supplier / Dealer</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone & Email</th>
                <th className="py-3 px-4">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {s.contactPerson || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      <div>{s.phone || 'No phone'}</div>
                      {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.outstandingPayable > 0 ? (
                        <span className="font-extrabold text-amber-700 font-mono">
                          ₹{s.outstandingPayable.toFixed(2)} (Payable)
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 font-mono">
                          ₹0.00 (Settled)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(s)}
                        title="Edit Supplier"
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
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier / Dealer'}
        description="Record wholesale fabric dealers and contact details."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Supplier / Business Name"
            required
            placeholder="e.g. Surat Silk Weavers Ltd."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              placeholder="e.g. Rajesh Shah"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98250 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="dealer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="City / Market Address"
              placeholder="e.g. Surat Textile Market"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Terms & Notes
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="e.g., 30 days credit limit, 2% cash discount on prompt settlement"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
