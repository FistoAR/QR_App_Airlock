import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '../components/UI/Toast';

import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import qrimg from "../assets/wd.png";

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await registerUser(data.name, data.email, data.password);
    setLoading(false);

    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-[3vw]" style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)' }}>
        <div className="text-center text-white max-w-[30vw]">
          <div className="w-[15vw] h-[15vw] mx-auto mb-[2vw] bg-white/10 rounded-[1vw] flex items-center justify-center">
            <img src={qrimg} alt="QR Code" className="w-[12vw] h-[12vw] object-contain rounded-[0.5vw]" />
          </div>
          <h2 className="text-[1.75vw] font-bold mb-[0.75vw]">Start Creating Today</h2>
          <p className="text-[0.95vw] text-white/80">
            Join thousands of users creating beautiful, customizable QR codes.
            Free to start, powerful features to grow.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-[3vw]">
        <div className="w-full max-w-[25vw]">
          <h1 className="text-[1.75vw] font-bold text-slate-800 mb-[0.5vw]">Create an account</h1>
          <p className="text-[0.9vw] text-slate-500 mb-[2vw]">
            Get started with your free account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-[1vw]">
            <div>
              <label className="block text-[0.85vw] font-medium text-slate-700 mb-[0.4vw]">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 text-[1vw]" />
                <input
                  {...register('name')}
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-[2.5vw] pr-[0.75vw] py-[0.7vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
                  style={{ '--tw-ring-color': '#2563eb' }}
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-[0.75vw] mt-[0.25vw]">{errors.name.message}</p>
              )}
            </div>

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
                  className="w-full pl-[2.5vw] pr-[0.75vw] py-[0.7vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
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
                  className="w-full pl-[2.5vw] pr-[2.5vw] py-[0.7vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
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

            <div>
              <label className="block text-[0.85vw] font-medium text-slate-700 mb-[0.4vw]">
                Confirm Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 text-[1vw]" />
                <input
                  {...register('confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-[2.5vw] pr-[0.75vw] py-[0.7vw] text-[0.9vw] border border-slate-200 rounded-[0.5vw] focus:outline-none"
                  style={{ '--tw-ring-color': '#2563eb' }}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-[0.75vw] mt-[0.25vw]">{errors.confirmPassword.message}</p>
              )}
            </div>

            <label className="flex items-start gap-[0.4vw]">
              <input type="checkbox" required className="w-[1vw] h-[1vw] rounded mt-[0.2vw]" style={{ accentColor: '#2563eb' }} />
              <span className="text-[0.8vw] text-slate-600">
                I agree to the{' '}
                <Link to="/terms" className="hover:underline" style={{ color: '#2563eb' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="hover:underline" style={{ color: '#2563eb' }}>Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[0.75vw] text-white text-[0.9vw] font-medium rounded-[0.5vw] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[0.5vw]"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              {loading && <div className="w-[1vw] h-[1vw] border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[0.85vw] text-slate-600 mt-[1.5vw]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: '#2563eb' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;