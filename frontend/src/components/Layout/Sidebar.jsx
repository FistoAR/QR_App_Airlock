import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiPlusCircle,
  FiGrid,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
//   FiPin,
  FiMenu,
} from 'react-icons/fi';
import { useSidebarStore } from '../../store/sidebarStore';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.png'

const menuItems = [
  { path: '/create', icon: FiPlusCircle, label: 'Create QR' },
  { path: '/qrcodes', icon: FiGrid, label: 'My QR Codes' },
  { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { isExpanded, isPinned, toggle, setHovered, togglePin } = useSidebarStore();
  const { logout, user } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarWidth = isExpanded ? '18vw' : '5vw';

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        fixed left-0 top-0 h-screen text-white
        flex flex-col z-50 sidebar-transition
      `}
      style={{ width: sidebarWidth, backgroundColor: '#1f2937' }}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-center w-[100%] p-[1vw] border-b border-slate-700">
        <div className="">
            <img src={logo} alt="Logo" className={`w-[${isExpanded ? '10vw' : '8vw'}] h-auto`}  />
         
        </div>
        
        {/* Toggle Button */}
        {isExpanded && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={toggle}
            className="p-[0.4vw] hover:bg-slate-700 ml-[3vw] rounded-[0.3vw] transition-colors"
          >
            <FiChevronLeft className="text-[1vw]" />
          </motion.button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-[1vw] overflow-y-auto">
        <ul className="space-y-[0.3vw] px-[0.5vw]">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-[0.75vw] p-[0.75vw] rounded-[0.5vw]
                  transition-all duration-200 group
                  ${isActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }
                  ${!isExpanded && 'justify-center'}
                `}
                style={({ isActive }) => isActive ? { backgroundColor: '#2563eb' } : {}}
              >
                <item.icon className="text-[1.25vw] flex-shrink-0" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[0.85vw] whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pin Toggle */}
      {isExpanded && (
        <div className="px-[0.75vw] py-[0.5vw] border-t border-slate-700">
          <button
            onClick={togglePin}
            className={`
              flex items-center gap-[0.75vw] w-full p-[0.75vw] rounded-[0.5vw]
              text-[0.8vw] transition-colors
              ${isPinned 
                ? 'text-slate-300' 
                : 'text-slate-400 hover:bg-slate-700'
              }
            `}
            style={isPinned ? { backgroundColor: 'rgba(37, 99, 235, 0.2)' } : {}}
          >
            {/* <FiPin className={`text-[1vw] ${isPinned && 'rotate-45'}`} /> */}
            <span>{isPinned ? 'Pinned' : 'Pin Sidebar'}</span>
          </button>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-slate-700 p-[0.75vw]">
        <div
          className={`
            flex items-center gap-[0.75vw] p-[0.5vw] rounded-[0.5vw]
            hover:bg-slate-700 cursor-pointer transition-colors
            ${!isExpanded && 'justify-center'}
          `}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-[2vw] h-[2vw] rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3b82f6' }}>
            <span className="text-[0.8vw] font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="text-[0.8vw] font-medium truncate">{user?.name}</p>
                <p className="text-[0.65vw] text-slate-400 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu Dropdown */}
        <AnimatePresence>
          {showUserMenu && isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-[0.5vw]"
            >
              <button
                onClick={handleLogout}
                className="flex items-center gap-[0.75vw] w-full p-[0.75vw] rounded-[0.5vw]
                  text-red-400 hover:bg-red-500/10 transition-colors text-[0.8vw]"
              >
                <FiLogOut className="text-[1vw]" />
                <span>Logout</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapsed Expand Button */}
      {!isExpanded && (
        <button
          onClick={toggle}
          className="absolute right-[-0.75vw] top-1/2 transform -translate-y-1/2
            w-[1.5vw] h-[1.5vw] rounded-full
            flex items-center justify-center shadow-lg transition-colors"
          style={{ backgroundColor: '#2563eb' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#3b82f6'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          <FiChevronRight className="text-[0.8vw]" />
        </button>
      )}
    </motion.aside>
  );
};

export default Sidebar;