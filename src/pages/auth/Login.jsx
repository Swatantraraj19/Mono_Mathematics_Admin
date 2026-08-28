import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import logo from '../../assets/logo.png';

export const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // If already authenticated, always send to Dashboard (/)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back! Signed in successfully.');
      // Always direct user to Dashboard upon successful login
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      let message = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else if (err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col justify-center items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-[400px] my-auto space-y-4">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <img
              src={logo}
              alt="Mono Mathematics Logo"
              className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200 hover:scale-105"
            />
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-primary-700 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
            Administration Portal
          </div>
        </div>

        {/* Compact Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 sm:p-7">
          <div className="mb-4 text-left">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Sign in to your account
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access the admin portal
            </p>
          </div>

          <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
            <div>
              <Input
                label="Admin Email"
                type="email"
                placeholder="admin@monomathematics.com"
                icon={Mail}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                error={errors.email}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                trailingIcon={showPassword ? EyeOff : Eye}
                onTrailingIconClick={() => setShowPassword(!showPassword)}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                error={errors.password}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="pt-1.5">
              <Button
                type="submit"
                variant="primary"
                className="w-full text-sm font-semibold py-2.5"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Sign In to Admin Panel
              </Button>
            </div>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3 text-center">
            <p className="text-[11px] text-slate-400">
              Authorized administrator access only. All sessions are monitored.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
