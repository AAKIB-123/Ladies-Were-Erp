import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Edit2, Power, Store, Info, Search, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Location } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useLocation } from '../../contexts/LocationContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { refreshLocations } = useLocation();

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/locations?includeInactive=${includeInactive}`);
      if (res.data.success) {
        setLocations(res.data.locations);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch locations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [includeInactive]);

  const openAddModal = () => {
    setEditingLocation(null);
    setFormName('');
    setFormCode('');
    setFormAddress('');
    setFormDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setFormName(loc.name);
    setFormCode(loc.code);
    setFormAddress(loc.address || '');
    setFormDescription(loc.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showToast('Please provide both location name and code.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingLocation) {
        const locId = editingLocation._id || editingLocation.id;
        await api.put(`/locations/${locId}`, {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          address: formAddress.trim(),
          description: formDescription.trim()
        });
        showToast('Location updated successfully', 'success');
      } else {
        await api.post('/locations', {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          address: formAddress.trim(),
          description: formDescription.trim()
        });
        showToast('New location created successfully', 'success');
      }
      setIsModalOpen(false);
      await fetchLocations();
      await refreshLocations();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save location', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (loc: Location) => {
    const locId = loc._id || loc.id;
    const newStatus = !loc.isActive;
    const actionName = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} "${loc.name}"?`)) {
      return;
    }

    try {
      await api.put(`/locations/${locId}/status`, { isActive: newStatus });
      showToast(`Location ${loc.name} ${newStatus ? 'activated' : 'deactivated'}`, 'success');
      await fetchLocations();
      await refreshLocations();
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${actionName} location`, 'error');
    }
  };

  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    (l.address && l.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-pink-600" />
            Dynamic Locations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage your stores, home boutiques, pop-up stalls, and future branches dynamically.
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add New Location
        </Button>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Accounting Rule:</span> Locations can be renamed or deactivated at any time without corrupting past transactions. Deactivated locations remain available in historical financial and stock reports.
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
            />
            <span>Show Inactive Locations</span>
          </label>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Address & Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Loading locations...
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No locations found.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => (
                  <tr key={loc._id || loc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-pink-600" />
                        <span>{loc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {loc.code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {loc.address || <span className="text-slate-400 italic">No address provided</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {loc.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(loc)}
                          title="Edit Location"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(loc)}
                          title={loc.isActive ? 'Deactivate Location' : 'Activate Location'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            loc.isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLocation ? 'Edit Location' : 'Add New Location'}
        description={
          editingLocation
            ? 'Update the name, code, or description of this sales point.'
            : 'Add a new shop, boutique, stall, or sales point.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Location Name"
            required
            placeholder="e.g. Home Boutique, Exhibition Stall 4"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Input
            label="Location Code"
            required
            placeholder="e.g. LOC-HOME, LOC-EXHIB-4"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            helperText="Short uppercase identifier used in transactions and reports."
          />

          <Input
            label="Address (Optional)"
            placeholder="Street address or booth number"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              className="block w-full rounded-xl border border-slate-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="e.g., Seasonal exhibition venue running from Oct to Dec"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
