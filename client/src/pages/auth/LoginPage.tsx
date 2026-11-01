import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AppBrand } from '../../components/common/AppBrand';
import { ThemeToggle } from '../../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/staff/pos');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid credentials or server unavailable.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-content relative min-h-screen bg-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <AppBrand className="scale-[1.4]" />
        </div>
        <p className="mt-2 text-sm text-forest-700 font-medium">
          LADIES WEAR · PREMIUM SHOP MANAGEMENT SYSTEM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_24px_64px_rgba(25,41,29,0.12)] rounded-3xl sm:px-10 border border-gold-500/30">
          {isExpired && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              Your session has expired. Please sign in again.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="you@ladieswear.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-lg shadow-pink-600/30"
                isLoading={isLoading}
              >
                Sign In to POS
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
