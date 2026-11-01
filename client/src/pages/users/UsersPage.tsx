import React, { useState, useEffect } from 'react';
import { Plus, UserCog, Edit2, Power, Shield, User, Search, Store } from 'lucide-react';
import api from '../../services/api';
import { User as UserType, Location } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'staff'>('staff');
  const [formAssignedLocations, setFormAssignedLocations] = useState<string[]>([]);
  const [formPhone, setFormPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, locsRes] = await Promise.all([
        api.get('/users'),
        api.get('/locations?includeInactive=false')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (locsRes.data.success) setLocations(locsRes.data.locations);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load user accounts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('staff');
    setFormAssignedLocations([]);
    setFormPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserType) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormAssignedLocations(
      (u.assignedLocations || []).map((loc: any) => loc._id || loc.id || loc)
    );
    setFormPhone(u.phone || '');
    setIsModalOpen(true);
  };

  const handleToggleLocation = (locId: string) => {
    setFormAssignedLocations((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Please enter name and email.', 'error');
      return;
    }

    if (!editingUser && (!formPassword || formPassword.length < 6)) {
      showToast('Password must be at least 6 characters for a new account.', 'error');
      return;
    }

    if (formRole === 'staff' && formAssignedLocations.length === 0) {
      showToast('Please assign at least one location for sales staff.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        const uId = editingUser.id || editingUser._id;
        await api.put(`/users/${uId}`, {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword || undefined,
          role: formRole,
          assignedLocations: formAssignedLocations,
          phone: formPhone.trim()
        });
        showToast('User account updated successfully', 'success');
      } else {
        await api.post('/users', {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          assignedLocations: formAssignedLocations,
          phone: formPhone.trim()
        });
        showToast('New user account created successfully', 'success');
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save user account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: UserType) => {
    const uId = u.id || u._id;
    if (uId === currentUser?.id) {
      showToast('You cannot deactivate your own logged-in account.', 'error');
      return;
    }

    const newStatus = !u.isActive;
    const actionName = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} "${u.name}"?`)) {
      return;
    }

    try {
      await api.put(`/users/${uId}/status`, { isActive: newStatus });
      showToast(`User ${u.name} ${newStatus ? 'activated' : 'deactivated'}`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${actionName} user`, 'error');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone && u.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-pink-600" />
            Staff Accounts & Permissions
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage floor staff, assign branch permissions, and control administrative access.
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Add Staff Member
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Locations</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uId = u.id || u._id;
                  return (
                    <tr key={uId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <Badge variant="warning" className="flex items-center gap-1 w-max">
                            <Shield className="w-3 h-3" /> Admin / Owner
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="flex items-center gap-1 w-max">
                            <User className="w-3 h-3" /> Staff
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Global Access (All Locations)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.assignedLocations && u.assignedLocations.length > 0 ? (
                              u.assignedLocations.map((loc: any) => (
                                <span
                                  key={loc._id || loc.id || loc}
                                  className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200"
                                >
                                  {loc.name || loc.code || 'Branch'}
                                </span>
                              ))
                            ) : (
                              <span className="text-rose-500 italic text-[11px]">No location assigned</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit User"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {uId !== currentUser?.id && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={u.isActive ? 'Deactivate User' : 'Activate User'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Account' : 'Add New Staff Account'}
        description="Configure account credentials and assign location authorization."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Priya Sharma"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="priya@ladieswear.local"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />

          <Input
            label={editingUser ? 'Password (Leave blank to keep current)' : 'Password'}
            type="password"
            required={!editingUser}
            placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium"
              >
                <option value="staff">Staff (Floor Sales)</option>
                <option value="admin">Admin / Owner (Global Access)</option>
              </select>
            </div>

            <div>
              <Input
                label="Phone Number"
                placeholder="+91 98765 00000"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Assigned Locations (for Staff) */}
          {formRole === 'staff' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Locations <span className="text-pink-600">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Staff can only record sales, view stock, and create expenses for checked locations.
              </p>
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
                {locations.map((loc) => {
                  const locId = (loc._id || loc.id) as string;
                  if (!locId) return null;
                  const checked = formAssignedLocations.includes(locId);
                  return (
                    <label
                      key={locId}
                      className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none font-medium p-1 hover:bg-white rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleLocation(locId)}
                        className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4"
                      />
                      <span>
                        {loc.name} <span className="text-slate-400 font-mono">({loc.code})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
              {editingUser ? 'Save Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
