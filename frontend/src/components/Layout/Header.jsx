import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiPlus } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';

const pageTitle = {
  '/dashboard': 'Dashboard',
  '/create': 'Create QR Code',
  '/qrcodes': 'My QR Codes',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const title = pageTitle[location.pathname] || 'Dashboard';

  return (
    <header className="h-[4.5vw] bg-white border-b border-slate-200 px-[1.5vw] flex items-center justify-between flex-shrink-0">
      {/* Left - Title */}
      <div>
        <h1 className="text-[1.5vw] font-bold text-slate-800">{title}</h1>
        <p className="text-[0.75vw] text-slate-500">
          Welcome back 👋, {user?.name?.split(' ')[0]}!
        </p>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-[25vw] mx-[2vw]">
        <div className="relative">
          <FiSearch className="absolute left-[0.75vw] top-1/2 transform -translate-y-1/2 text-slate-400 text-[1vw]" />
          <input
            type="text"
            placeholder="Search QR codes..."
            className="w-full pl-[2.5vw] pr-[1vw] py-[0.6vw] text-[0.85vw] border border-slate-200 rounded-[0.5vw] focus:outline-none focus:border-transparent transition-all"
            style={{ '--tw-ring-color': '#2563eb' }}
            onChange={(e) => {
              const query = e.target.value;
              if (location.pathname !== '/qrcodes') {
                navigate(`/qrcodes?search=${encodeURIComponent(query)}`);
              } else {
                // If already on /qrcodes, the search query should be updated in the URL
                const searchParams = new URLSearchParams(location.search);
                if (query) {
                  searchParams.set('search', query);
                } else {
                  searchParams.delete('search');
                }
                navigate({ search: searchParams.toString() }, { replace: true });
              }
            }}
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-[1vw] ">
        {/* Quick Create Button */}
        <button
          onClick={() => navigate('/create')}
          className="flex cursor-pointer items-center gap-[0.5vw]  px-[1vw] py-[0.6vw]
            text-white rounded-[0.5vw] transition-colors text-[0.85vw] font-medium bg-[#1d4ed8]"
          style={{ backgroundColor: '#2563eb' }}
        >
          <FiPlus className="text-[1vw]" />
          <span>Create QR</span>
        </button>

        {/* Notifications */}
        {/* <button className="relative p-[0.6vw] text-slate-500 hover:bg-slate-100 rounded-[0.4vw] transition-colors">
          <FiBell className="text-[1.25vw]" />
          <span className="absolute top-[0.3vw] right-[0.3vw] w-[0.5vw] h-[0.5vw] bg-red-500 rounded-full"></span>
        </button> */}

        {/* User Avatar */}
        {/* <div className="flex items-center gap-[0.75vw] pl-[1vw] border-l border-slate-200">
          <div className="w-[2.25vw] h-[2.25vw] rounded-full flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
            <span className="text-white text-[0.9vw] font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden lg:block">
            <p className="text-[0.8vw] font-medium text-slate-700">{user?.name}</p>
            <p className="text-[0.65vw] text-slate-500 capitalize">{user?.subscription?.plan} Plan</p>
          </div>
        </div> */}
      </div>
    </header>
  );
};

export default Header;