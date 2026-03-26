import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebarStore } from '../../store/sidebarStore';

const MainLayout = ({ children }) => {
  const { isExpanded, isPinned } = useSidebarStore();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50  overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col transition-all duration-300 ease-in-out
          ${isExpanded ? 'ml-[18vw]' : 'ml-[5vw]'}
        `}
      >
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-hidden  px-[1.5vw] py-[1vw]">
          <div className="fade-in h-full flex flex-col " >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;