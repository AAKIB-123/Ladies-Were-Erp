import React, { useState, useEffect } from 'react';
import { Plus, Tags, Search, Edit2, Power, ChevronDown, ChevronRight, Layers, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

interface ProductVariant {
  variantId: string;
  size?: string;
  colour?: string;
  skuSuffix?: string;
  defaultPrice?: number;
  currentCost?: number;
  isActive: boolean;
}

interface Product {
  _id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  defaultPrice: number;
  currentWeightedAverageCost?: number;
  isActive: boolean;
  variants: ProductVariant[];
  createdAt: string;
}

const CATEGORIES = [
  'Sarees',
  'Kurtis',
  'Suits & Sets',
  'Lehengas',
  'Dresses',
  'Tops & Tunics',
  'Bottoms & Dupattas',
  'Bridal Wear',
  'Other'
];

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formCost, setFormCost] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [variants, setVariants] = useState<Array<{ size: string; colour: string; price: string }>>([
    { size: 'Free Size', colour: 'Standard', price: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/products');
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormSku('');
    setFormName('');
    setFormCategory(CATEGORIES[0]);
    setFormUnit('pcs');
    setFormPrice('');
    setFormCost('');
    setFormDescription('');
    setVariants([{ size: 'Free Size', colour: 'Standard', price: '' }]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormPrice(p.defaultPrice);
    setFormCost(p.currentWeightedAverageCost ?? '');
    setFormDescription(p.description || '');
    setVariants(
      p.variants.map((v) => ({
        size: v.size || '',
        colour: v.colour || '',
        price: v.defaultPrice ? String(v.defaultPrice) : ''
      }))
    );
    setIsModalOpen(true);
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, { size: '', colour: '', price: '' }]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index: number, field: string, val: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim() || formPrice === '') {
      showToast('Please fill in SKU, Name, and Default Selling Price.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedVariants = variants.map((v, idx) => {
        const sizeTag = v.size ? v.size.replace(/\s+/g, '-').toUpperCase() : 'DEF';
        const colorTag = v.colour ? v.colour.replace(/\s+/g, '-').toUpperCase() : 'STD';
        return {
          variantId: `VAR-${sizeTag}-${colorTag}-${idx}`,
          size: v.size.trim() || 'Free Size',
          colour: v.colour.trim() || 'Standard',
          skuSuffix: `-${sizeTag}-${colorTag}`,
          defaultPrice: v.price ? parseFloat(v.price) : Number(formPrice),
          currentCost: Number(formCost) || 0,
          isActive: true
        };
      });

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, {
          name: formName.trim(),
          category: formCategory,
          unit: formUnit,
          defaultPrice: Number(formPrice),
          description: formDescription.trim(),
          variants: formattedVariants
        });
        showToast('Product updated successfully', 'success');
      } else {
        await api.post('/products', {
          sku: formSku.trim().toUpperCase(),
          name: formName.trim(),
          category: formCategory,
          unit: formUnit,
          defaultPrice: Number(formPrice),
          currentWeightedAverageCost: Number(formCost) || 0,
          description: formDescription.trim(),
          variants: formattedVariants
        });
        showToast('Product and variants created successfully', 'success');
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (p: Product) => {
    const newStatus = !p.isActive;
    const actionName = newStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} "${p.name}"?`)) {
      return;
    }

    try {
      await api.put(`/products/${p._id}/status`, { isActive: newStatus });
      showToast(`Product ${p.name} ${newStatus ? 'activated' : 'deactivated'}`, 'success');
      await fetchProducts();
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${actionName} product`, 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="w-6 h-6 text-pink-600" />
            Products & Variants
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage sarees, kurtis, lehengas, size/colour variations, and selling prices.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAddModal} variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add New Product
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by SKU or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Selling Price</th>
                {isAdmin && <th className="py-3 px-4">Avg Cost (WAC)</th>}
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400 font-medium">
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400 font-medium">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isExpanded = expandedRow === p._id;
                  return (
                    <React.Fragment key={p._id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : p._id)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {p.sku}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] bg-pink-50 text-pink-700 font-semibold px-2 py-0.5 rounded-md border border-pink-100">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          ₹{p.defaultPrice.toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                            ₹{(p.currentWeightedAverageCost || 0).toFixed(2)}
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            {p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="danger">Inactive</Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditModal(p)}
                                title="Edit Product"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(p)}
                                title={p.isActive ? 'Deactivate Product' : 'Activate Product'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  p.isActive
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Expanded Variants Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={isAdmin ? 9 : 8} className="p-4 pl-12 border-b border-slate-100">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-pink-600" />
                              Size & Colour Variations
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {p.variants.map((v, i) => (
                                <div
                                  key={i}
                                  className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      {v.colour || 'Standard'} • {v.size || 'Free Size'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {p.sku}{v.skuSuffix || ''}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-pink-600 block">
                                      ₹{(v.defaultPrice || p.defaultPrice).toFixed(2)}
                                    </span>
                                    {isAdmin && (
                                      <span className="text-[10px] text-slate-400 block font-mono">
                                        Cost: ₹{(v.currentCost || 0).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product & Variants'}
        description="Specify product details, categories, default price, and size/colour variations."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Product SKU / Barcode"
              required
              disabled={!!editingProduct}
              placeholder="e.g. SAR-SILK-01"
              value={formSku}
              onChange={(e) => setFormSku(e.target.value.toUpperCase())}
            />
            <Input
              label="Product Name"
              required
              placeholder="e.g. Banarasi Georgette Saree"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-pink-600">*</span>
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <Input
              label="Unit Selling Price (₹)"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="2500"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value ? parseFloat(e.target.value) : '')}
            />

            {isAdmin && (
              <Input
                label="Initial Avg Cost (₹)"
                type="number"
                min="0"
                step="0.01"
                placeholder="1400"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value ? parseFloat(e.target.value) : '')}
                helperText="Auto-updated on purchases"
              />
            )}
          </div>

          {/* Variants Matrix */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Size & Colour Variants</span>
                <span className="text-[11px] text-slate-500">Each combination creates an independent stock record.</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow} icon={<Plus className="w-3.5 h-3.5" />}>
                Add Variant
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Size (e.g. M, XL, Free Size)"
                    className="flex-1 rounded-xl border border-slate-300 text-xs p-2 bg-white"
                    value={v.size}
                    onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Colour (e.g. Red, Pink)"
                    className="flex-1 rounded-xl border border-slate-300 text-xs p-2 bg-white"
                    value={v.colour}
                    onChange={(e) => updateVariantRow(idx, 'colour', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Override Price (Optional)"
                    className="w-28 rounded-xl border border-slate-300 text-xs p-2 bg-white"
                    value={v.price}
                    onChange={(e) => updateVariantRow(idx, 'price', e.target.value)}
                  />
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
