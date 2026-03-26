import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '../components/UI/Toast';

import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';

import qrimg from "../assets/wd.png"

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-[3vw]">
        <div className="w-full max-w-[25vw]">
          <h1 className="text-[1.75vw] font-bold text-slate-800 mb-[0.5vw]">Welcome back</h1>
          <p className="text-[0.9vw] text-slate-500 mb-[2vw]">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-[1.25vw]">
            <div>
              <label className="block text-[0.85vw] font-medium text-slate-700 mb-[0.4vw]">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 text-[1vw]" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-[2.5vw] pr-[0.75vw] py-[0.75vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
                  style={{ '--tw-ring-color': '#2563eb' }}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-[0.75vw] mt-[0.25vw]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[0.85vw] font-medium text-slate-700 mb-[0.4vw]">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 text-[1vw]" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-[2.5vw] pr-[2.5vw] py-[0.75vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
                  style={{ '--tw-ring-color': '#2563eb' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <FiEyeOff className="text-[1vw]" /> : <FiEye className="text-[1vw]" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-[0.75vw] mt-[0.25vw]">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center mb-[1.25vw]">
              <label className="flex items-center gap-[0.4vw]">
                <input type="checkbox" className="w-[1vw] h-[1vw] rounded" style={{ accentColor: '#2563eb' }} />
                <span className="text-[0.8vw] text-slate-600">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[0.75vw] text-white text-[0.9vw] font-medium rounded-[0.5vw] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.5vw]"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              {loading && <div className="w-[1vw] h-[1vw] border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[0.85vw] text-slate-600 mt-[1.5vw]">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: '#2563eb' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-[3vw]" style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)' }}>
        <div className="text-center text-white max-w-[30vw]">
          <div className="w-[15vw] h-[15vw] mx-auto mb-[2vw] bg-white/10 rounded-[1vw] flex items-center justify-center">
            <img src={qrimg} alt="QR Code" className="w-[12vw] h-[12vw] object-contain rounded-[0.5vw]" />
          </div>
          <h2 className="text-[1.75vw] font-bold mb-[0.75vw]">Create Beautiful QR Codes</h2>
          <p className="text-[0.95vw] text-white/80">
            Generate custom QR codes for URLs, contacts, files, and more. 
            Track scans and manage all your codes in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;