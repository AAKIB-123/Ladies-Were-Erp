import React, { useEffect, useState } from 'react';
import { Settings2, Save, RotateCcw, ShieldCheck, Bell, Store, BadgeDollarSign, Moon, Sun } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBrand } from '../../components/common/AppBrand';

const STORAGE_KEY = 'lw_app_settings';

const defaultSettings = {
  businessName: 'FANCY COLLECTION',
  phone: '+91 98765 43210',
  email: 'hello@ladieswear.local',
  address: 'Surat Textile Market, Gujarat',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  defaultTaxRate: '5',
  lowStockThreshold: '10',
  voidReasonRequired: true,
  auditTrailVisible: true,
  autoLogoutMinutes: '30',
  dailySummaryEmail: true,
  salesReceiptFooter:
    'Thank you for shopping with FANCY COLLECTION. We value your trust and look forward to serving you again.'
};

type SettingsState = typeof defaultSettings;

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { theme, setThemePreference } = useTheme();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load app settings', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updateField = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      showToast('Application settings saved successfully.', 'success');
    } catch (error) {
      console.error('Failed to save app settings', error);
      showToast('Unable to save settings. Please try again.', 'error');
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    showToast('Settings reset to default values.', 'info');
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-sm text-slate-500">
          Loading application settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <AppBrand compact className="mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-pink-600" />
            Application Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure the operational defaults used across the store, POS, and audit workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            Reset
          </Button>
          <Button variant="primary" size="md" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-4 h-4 text-pink-600" />
              <h2 className="text-base font-black text-slate-900">Business Profile</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                value={settings.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
              />
              <Input
                label="Phone"
                value={settings.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={settings.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Input
                label="Currency"
                value={settings.currency}
                onChange={(e) => updateField('currency', e.target.value)}
              />
              <div className="md:col-span-2">
                <Input
                  label="Business Address"
                  value={settings.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>
              <Input
                label="Timezone"
                value={settings.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
              />
              <Input
                label="Default Tax Rate (%)"
                type="number"
                min="0"
                step="0.1"
                value={settings.defaultTaxRate}
                onChange={(e) => updateField('defaultTaxRate', e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">POS & Inventory Defaults</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Low Stock Threshold"
                type="number"
                min="0"
                value={settings.lowStockThreshold}
                onChange={(e) => updateField('lowStockThreshold', e.target.value)}
              />
              <Input
                label="Auto-logout (minutes)"
                type="number"
                min="5"
                max="240"
                value={settings.autoLogoutMinutes}
                onChange={(e) => updateField('autoLogoutMinutes', e.target.value)}
              />
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Receipt Footer Message
                </label>
                <textarea
                  value={settings.salesReceiptFooter}
                  onChange={(e) => updateField('salesReceiptFooter', e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[100px] px-3.5 py-2.5"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-4 h-4 text-gold-600" />
              <h2 className="text-base font-black text-slate-900">Appearance</h2>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Choose a display theme. Your preference is saved for future visits.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon }
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setThemePreference(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    theme === value
                      ? 'border-gold-500 bg-gold-50 text-forest-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              <h2 className="text-base font-black text-slate-900">Security & Compliance</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700">
                <span>Require mandatory void reason</span>
                <input
                  type="checkbox"
                  checked={settings.voidReasonRequired}
                  onChange={(e) => updateField('voidReasonRequired', e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700">
                <span>Show audit trail in admin UI</span>
                <input
                  type="checkbox"
                  checked={settings.auditTrailVisible}
                  onChange={(e) => updateField('auditTrailVisible', e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
                />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-black text-slate-900">Notifications</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700">
                <span>Daily summary email</span>
                <input
                  type="checkbox"
                  checked={settings.dailySummaryEmail}
                  onChange={(e) => updateField('dailySummaryEmail', e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
