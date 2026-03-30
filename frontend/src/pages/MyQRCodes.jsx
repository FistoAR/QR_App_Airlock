import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '../components/UI/Toast';
import { useConfirm } from '../components/UI/ConfirmDialog';

import {
  FiGrid, FiList, FiMoreVertical, FiEdit, FiTrash2, FiCopy,
  FiDownload, FiExternalLink, FiBarChart2, FiChevronLeft, FiChevronRight,
  FiTrendingUp, FiClock, FiActivity, FiMapPin, FiX, FiFilter,
  FiMonitor, FiSmartphone, FiTablet,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { qrCodeAPI, analyticsAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const flagEmoji = (cc) => {
  if (!cc || cc.length !== 2) return null;
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
};

const safeLocation = (loc) => {
  if (!loc) return null;
  const city = loc.city && loc.city !== 'Unknown' && loc.city !== 'null' ? loc.city : null;
  const country = loc.country && loc.country !== 'Unknown' ? loc.country : null;
  const countryCode = loc.countryCode && loc.countryCode.length === 2 ? loc.countryCode : null;
  if (!city && !country) return null;
  return { city, country, countryCode };
};

const DeviceIcon = ({ type }) => {
  if (type === 'mobile') return <FiSmartphone className="text-[0.8vw] text-slate-400" />;
  if (type === 'tablet')  return <FiTablet    className="text-[0.8vw] text-slate-400" />;
  return <FiMonitor className="text-[0.8vw] text-slate-400" />;
};

/* ─── constants ───────────────────────────────────────────────────────── */
const qrTypes = [
  { id: 'all', label: 'All Types' },
  { id: 'url',      label: 'URL' },
  { id: 'vcard',    label: 'vCard' },
  { id: 'document', label: 'Document' },
  { id: 'media',    label: 'Media' },
];

const sortOptions = [
  { id: '-createdAt',  label: 'Newest First',  icon: FiClock },
  { id: 'createdAt',   label: 'Oldest First',  icon: FiActivity },
  { id: '-scanCount',  label: 'Most Scanned',  icon: FiTrendingUp },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';

/* ─── QRCodeCard ──────────────────────────────────────────────────────── */
const QRCodeCard = React.memo(React.forwardRef(({
  qr, viewMode, navigate, activeMenu, setActiveMenu,
  handleDownload, handleDuplicate, handleDelete,
  isSelected, toggleSelect, lastLocation, onLocationClick,
  isDuplicating, isDeleting,
}, ref) => {
  const imgSrc = qr.qrImageUrl
    ? (qr.qrImageUrl.startsWith('http') ? qr.qrImageUrl : `${BACKEND_URL}${qr.qrImageUrl}`)
    : null;

  const [imgError, setImgError] = useState(false);

  const QRPlaceholder = ({ size = '100%' }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.25 }}>
      <rect x="5" y="5" width="38" height="38" rx="4" fill="none" stroke="#94a3b8" strokeWidth="6"/>
      <rect x="16" y="16" width="16" height="16" rx="2" fill="#94a3b8"/>
      <rect x="57" y="5" width="38" height="38" rx="4" fill="none" stroke="#94a3b8" strokeWidth="6"/>
      <rect x="68" y="16" width="16" height="16" rx="2" fill="#94a3b8"/>
      <rect x="5" y="57" width="38" height="38" rx="4" fill="none" stroke="#94a3b8" strokeWidth="6"/>
      <rect x="16" y="68" width="16" height="16" rx="2" fill="#94a3b8"/>
      <rect x="57" y="57" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="70" y="57" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="83" y="57" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="57" y="70" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="83" y="70" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="57" y="83" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="70" y="83" width="8" height="8" rx="1" fill="#94a3b8"/>
      <rect x="83" y="83" width="8" height="8" rx="1" fill="#94a3b8"/>
    </svg>
  );

  const [menuDirection, setMenuDirection] = useState('down');

  const safeLoc = safeLocation(lastLocation);

  const tooltipText = safeLoc
    ? `Last scan: ${[safeLoc.city, safeLoc.country].filter(Boolean).join(', ')}\nClick to see all scan locations`
    : 'No scan locations yet — click to check';

  useEffect(() => {
    if (activeMenu === qr._id && ref?.current) {
      const rect = ref.current.getBoundingClientRect();
      setMenuDirection(window.innerHeight - rect.bottom < 200 ? 'up' : 'down');
    }
  }, [activeMenu, qr._id, ref]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMenu === qr._id && ref?.current && !ref.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu === qr._id) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu, qr._id, setActiveMenu, ref]);

  /* ── LIST VIEW ── */
  if (viewMode === 'list') {
    return (
      <motion.div
        layout ref={ref}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        className="bg-white rounded-[0.5vw] border border-slate-200 p-[0.6vw] flex items-center gap-[1vw] hover:shadow-sm transition-shadow group relative"
      >
        <div className="shrink-0 flex items-center px-[0.4vw]">
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(qr._id)}
            className="w-[1vw] h-[1vw] rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
        </div>
        <Link to={`/qrcodes/${qr._id}`} className="shrink-0 relative">
          <div className={`w-[3.5vw] h-[3.5vw] bg-slate-50 p-[0.2vw] flex items-center justify-center ${
            qr.customization?.frame?.style === 'banner' ? 'rounded-[8px]' :
            qr.customization?.frame?.style === 'rounded' ? 'rounded-[8px]' :
            qr.customization?.frame?.style === 'simple' ? 'rounded-[4px]' : 'rounded-[8px]'
          }`}>
            {(imgSrc && !imgError)
              ? <img src={imgSrc} alt={qr.title} className={`w-full h-full object-contain ${
                  qr.customization?.frame?.style === 'banner' ? 'rounded-[6px]' :
                  qr.customization?.frame?.style === 'rounded' ? 'rounded-[6px]' :
                  qr.customization?.frame?.style === 'simple' ? 'rounded-[2px]' : 'rounded-[6px]'
                }`} onError={() => setImgError(true)} />
              : <QRPlaceholder size="100%" />}
          </div>
          {isDuplicating && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-[0.3vw]">
              <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <h3 className="text-[0.85vw] font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{qr.title}</h3>
          <span className="text-[0.6vw] text-slate-400 font-medium uppercase">{qrTypes.find(t => t.id === qr.type)?.label || qr.type}</span>
        </div>

        {/* Location button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLocationClick(qr); }}
          title={tooltipText}
          className={`flex items-center gap-[0.35vw] px-[0.65vw] py-[0.3vw] rounded-full border text-[0.65vw] font-medium transition-all cursor-pointer
            ${safeLoc ? 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
        >
          <FiMapPin className="text-[0.8vw]" />
          {safeLoc ? `${flagEmoji(safeLoc.countryCode) || ''} ${safeLoc.city || safeLoc.country}` : 'No scans'}
        </button>

        <div className="px-[1vw] flex items-center gap-[1.5vw]">
          <div className="flex flex-col items-end">
            <span className="text-[0.8vw] font-bold text-slate-700">{qr.scanCount}</span>
            <span className="text-[0.6vw] text-slate-400 uppercase">Scans</span>
          </div>
          <div className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.6vw] font-bold uppercase tracking-wider ${qr.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {qr.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="relative">
          {isDuplicating ? (
            <div className="p-[0.4vw] flex items-center justify-center">
              <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : isDeleting ? (
            <div className="p-[0.4vw] flex items-center justify-center">
              <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-2 border-red-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <button onClick={() => setActiveMenu(activeMenu === qr._id ? null : qr._id)}
                className="p-[0.4vw] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[0.3vw] cursor-pointer">
                <FiMoreVertical className="text-[1vw]" />
              </button>
              <AnimatePresence>
                {activeMenu === qr._id && (
                  <QRCodeMenu qr={qr} direction={menuDirection} navigate={navigate}
                    setActiveMenu={setActiveMenu} handleDownload={handleDownload}
                    handleDuplicate={handleDuplicate} handleDelete={handleDelete} />
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  /* ── GRID VIEW ── */
  return (
    <motion.div
      layout ref={ref}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-[0.75vw] border border-slate-200 hover:shadow-md transition-shadow group relative text-left"
    >
      <div className="absolute top-[0.5vw] left-[0.5vw] z-10">
        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(qr._id)}
          className="w-[1vw] h-[1vw] rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity" />
      </div>
      <Link to={`/qrcodes/${qr._id}`} className="block">
        <div className={`aspect-square bg-slate-50 p-[0.5vw] flex items-center justify-center  relative `}>
          {(imgSrc && !imgError)
            ? <img src={imgSrc} alt={qr.title} className={`w-full h-full object-contain group-hover:scale-105 transition-transform `} onError={() => setImgError(true)} />
            : <div className="flex flex-col items-center justify-center gap-[0.5vw]">
                <QRPlaceholder size="60%" />
                <span className="text-[0.6vw] text-slate-400 font-medium">Not Available</span>
              </div>}
          {isDuplicating && (
             <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
               <div className="animate-spin rounded-full h-[2vw] w-[2vw] border-2 border-blue-600 border-t-transparent" />
             </div>
          )}
        </div>
      </Link>

      <div className="p-[0.75vw] border-t border-slate-100">
        <div className="flex items-start justify-between mb-[0.5vw]">
          <div className="flex-1 min-w-0">
            <h3 className="text-[0.85vw] font-semibold text-slate-800 truncate">{qr.title}</h3>
            <p className="text-[0.6vw] text-slate-400 font-medium uppercase mt-[0.1vw]">
              {qrTypes.find(t => t.id === qr.type)?.label || qr.type}
            </p>
          </div>
          <div className="relative">
            {isDuplicating ? (
              <div className="p-[0.4vw] flex items-center justify-center">
                <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : isDeleting ? (
              <div className="p-[0.4vw] flex items-center justify-center">
                <div className="animate-spin rounded-full h-[1vw] w-[1vw] border-2 border-red-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === qr._id ? null : qr._id); }}
                  className="p-[0.4vw] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[0.3vw] cursor-pointer">
                  <FiMoreVertical className="text-[1vw]" />
                </button>
                <AnimatePresence>
                  {activeMenu === qr._id && (
                    <QRCodeMenu qr={qr} direction={menuDirection} navigate={navigate}
                      setActiveMenu={setActiveMenu} handleDownload={handleDownload}
                      handleDuplicate={handleDuplicate} handleDelete={handleDelete} />
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Scan count + status */}
        <div className="flex items-center justify-between text-[0.7vw] mb-[0.4vw]">
          <div className="flex items-center gap-[0.3vw] text-slate-500 text-[0.65vw]">
            <FiBarChart2 className="text-[0.8vw]" />
            {qr.scanCount} scans
          </div>
          <span className={`px-[0.4vw] py-[0.15vw] rounded-full text-[0.6vw] font-bold uppercase ${qr.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {qr.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Location button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLocationClick(qr); }}
          title={tooltipText}
          className={`w-full flex items-center gap-[0.35vw] px-[0.5vw] py-[0.3vw] rounded-[0.4vw] border text-[0.65vw] font-medium transition-all cursor-pointer
            ${safeLoc
              ? 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
              : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
        >
          <FiMapPin className="text-[0.8vw] shrink-0" />
          <span className="truncate">
            {safeLoc
              ? `${flagEmoji(safeLoc.countryCode) || ''} ${[safeLoc.city, safeLoc.country].filter(Boolean).join(', ')}`
              : 'No scan locations yet'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}));

/* ─── RenameModal ─────────────────────────────────────────────────────── */
const RenameModal = ({ isOpen, defaultValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => { if (isOpen) setValue(defaultValue); }, [isOpen, defaultValue]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
        className="bg-white rounded-t-[1vw] sm:rounded-[0.8vw] shadow-2xl border border-slate-200 p-[1.5vw] w-full max-w-[28vw] mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[1vw] font-bold text-slate-800 mb-[0.3vw]">Name Your Duplicate</h3>
        <p className="text-[0.7vw] text-slate-400 mb-[1vw]">Give the new QR code a unique name to tell it apart.</p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(value); if (e.key === 'Escape') onCancel(); }}
          className="w-full px-[0.75vw] py-[0.6vw] text-[0.85vw] border border-slate-200 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          placeholder="e.g. Campaign QR (Copy)"
        />
        <div className="flex gap-[0.5vw] mt-[1vw]">
          <button onClick={onCancel} className="flex-1 py-[0.5vw] text-[0.8vw] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[0.5vw] transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="flex-1 py-[0.5vw] text-[0.8vw] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-[0.5vw] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Duplicate
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── QRCodeMenu ──────────────────────────────────────────────────────── */
const QRCodeMenu = ({ qr, direction, navigate, setActiveMenu, handleDownload, handleDuplicate, handleDelete }) => {
  const positionClass = direction === 'up' ? 'bottom-full mb-[0.25vw]' : 'top-full mt-[0.25vw]';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      className={`absolute right-0 ${positionClass} w-[10vw] bg-white rounded-[0.4vw] shadow-xl border border-slate-200 z-50 overflow-hidden`}
    >
      {qr.isDynamic && (
        <button onClick={() => { navigate(`/qrcodes/${qr._id}`); setActiveMenu(null); }}
          className="w-full flex items-center gap-[0.5vw] px-[0.75vw] py-[0.5vw] text-[0.75vw] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
          <FiEdit className="text-[0.9vw]" /> Edit
        </button>
      )}
      <button onClick={() => handleDownload(qr._id, qr.title)} className="w-full flex items-center gap-[0.5vw] px-[0.75vw] py-[0.5vw] text-[0.75vw] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
        <FiDownload className="text-[0.9vw]" /> Download
      </button>
      <button onClick={() => handleDuplicate(qr._id)} className="w-full flex items-center gap-[0.5vw] px-[0.75vw] py-[0.5vw] text-[0.75vw] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
        <FiCopy className="text-[0.9vw]" /> Duplicate
      </button>
      <button onClick={() => window.open(qr.shortUrl, '_blank')} className="w-full flex items-center gap-[0.5vw] px-[0.75vw] py-[0.5vw] text-[0.75vw] text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
        <FiExternalLink className="text-[0.9vw]" /> Preview
      </button>
      <hr className="border-slate-100" />
      <button onClick={() => handleDelete(qr._id)} className="w-full flex items-center gap-[0.5vw] px-[0.75vw] py-[0.5vw] text-[0.75vw] text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
        <FiTrash2 className="text-[0.9vw]" /> Delete
      </button>
    </motion.div>
  );
};

/* ─── LocationPanel ───────────────────────────────────────────────────── */
const LocationPanel = ({ panel, onClose }) => {
  if (!panel.open) return null;
  const maxCount = panel.breakdown[0]?.count || 1;

  return (
    <AnimatePresence>
      {panel.open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
            onClick={onClose}
          />
          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full z-50 w-[22vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col"
          >
            {/* Header */}
            <div className="px-[1.25vw] py-[1vw] border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <div className="flex items-center gap-[0.5vw] mb-[0.2vw]">
                  <FiMapPin className="text-[1vw]" />
                  <h3 className="text-[0.95vw] font-bold">Scan Locations</h3>
                </div>
                <p className="text-[0.7vw] text-blue-200 truncate max-w-[16vw]">{panel.qrTitle}</p>
              </div>
              <button onClick={onClose} className="p-[0.4vw] hover:bg-white/20 rounded-[0.3vw] transition-colors cursor-pointer mt-[0.2vw]">
                <FiX className="text-[1.1vw]" />
              </button>
            </div>

            {panel.loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-[2vw] w-[2vw]" style={{ borderBottom: '2px solid #2563eb' }} />
                  <p className="text-[0.75vw] text-slate-400">Fetching locations...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* Country Breakdown */}
                {panel.breakdown.length > 0 && (
                  <div className="p-[1vw] border-b border-slate-100">
                    <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.75vw]">By Country</p>
                    <div className="space-y-[0.6vw]">
                      {panel.breakdown.map((b) => (
                        <div key={b.country} className="flex items-center gap-[0.6vw]">
                          <span className="text-[1vw] w-[1.4vw] text-center">{flagEmoji(b.countryCode) || '🌍'}</span>
                          <span className="text-[0.72vw] text-slate-700 font-semibold w-[4vw] truncate">{b.country}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-[0.35vw] overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-[0.65vw] font-bold text-slate-500 w-[2vw] text-right">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scan List */}
                <div className="p-[1vw]">
                  <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.75vw]">
                    Scan History ({panel.scans.length})
                  </p>
                  {panel.scans.length === 0 ? (
                    <div className="text-center py-[3vw]">
                      <FiMapPin className="mx-auto text-[2vw] text-slate-200 mb-2" />
                      <p className="text-[0.8vw] text-slate-400">No scans recorded yet</p>
                      <p className="text-[0.65vw] text-slate-300 mt-1">Scan your QR code to start tracking</p>
                    </div>
                  ) : (
                    <div className="space-y-[0.5vw]">
                      {panel.scans.map((scan, idx) => {
                        const locText = [scan.city, scan.country].filter(Boolean).join(', ') || 'Unknown location';
                        const flag = flagEmoji(scan.countryCode);
                        return (
                          <div key={idx} className="flex items-center gap-[0.6vw] p-[0.6vw] bg-slate-50 hover:bg-blue-50 rounded-[0.4vw] transition-colors border border-transparent hover:border-blue-100">
                            <div className="w-[2vw] h-[2vw] rounded-full bg-white border border-slate-200 flex items-center justify-center text-[0.95vw] shrink-0 shadow-sm">
                              {flag || '🌍'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[0.75vw] font-semibold text-slate-700 truncate">{locText}</p>
                              <div className="flex items-center gap-[0.3vw] text-[0.6vw] text-slate-400">
                                <DeviceIcon type={scan.deviceType} />
                                <span>{[scan.browser, scan.os].filter(Boolean).join(' · ') || 'Unknown device'}</span>
                              </div>
                            </div>
                            <p className="text-[0.6vw] text-slate-400 shrink-0 text-right">
                              {scan.createdAt ? formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true }) : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ─── MyQRCodes (main page) ───────────────────────────────────────────── */
const MyQRCodes = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';

  const [qrCodes, setQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [renameModal, setRenameModal] = useState({ open: false, id: null, defaultTitle: '' });
  const [qrLocationMap, setQrLocationMap] = useState({});
  const [locationPanel, setLocationPanel] = useState({
    open: false, qrId: null, qrTitle: '', loading: false, scans: [], breakdown: [],
  });

  useEffect(() => {
    fetchQRCodes();
  }, [pagination.page, typeFilter, searchQuery, sortBy]);

  // Load location map once on mount
  useEffect(() => {
    analyticsAPI.getDashboard()
      .then(res => setQrLocationMap(res.data.data.qrLocationMap || {}))
      .catch(() => {});
  }, []);

  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      };
      const response = await qrCodeAPI.getAll(params);
      setQRCodes(response.data.data);
      setPagination(prev => ({ ...prev, total: response.data.total, totalPages: response.data.totalPages }));
    } catch {
      toast.error('Failed to fetch QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = async (qr) => {
    setLocationPanel({ open: true, qrId: qr._id, qrTitle: qr.title, loading: true, scans: [], breakdown: [] });
    try {
      const res = await analyticsAPI.getQRLocations(qr._id);
      setLocationPanel(prev => ({
        ...prev,
        loading: false,
        scans: res.data.data.scans || [],
        breakdown: res.data.data.breakdown || [],
      }));
    } catch {
      setLocationPanel(prev => ({ ...prev, loading: false }));
      toast.error('Failed to load locations');
    }
  };

  const closeLocationPanel = () => setLocationPanel(prev => ({ ...prev, open: false }));

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete QR Code?',
      message: 'This will permanently delete this QR code and all its scan data.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(id);
    setActiveMenu(null);
    try {
      await qrCodeAPI.delete(id);
      toast.success('QR code deleted');
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchQRCodes();
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };


  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} QR Code${selectedIds.length > 1 ? 's' : ''}?`,
      message: `This will permanently delete ${selectedIds.length} selected QR code${selectedIds.length > 1 ? 's' : ''} and all their scan data.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setBulkDeleting(true);
    try {
      await qrCodeAPI.deleteMany(selectedIds);
      toast.success(`${selectedIds.length} QR codes deleted`);
      setSelectedIds([]);
      fetchQRCodes();
    } catch { toast.error('Failed to delete'); }
    finally { setBulkDeleting(false); }
  };


  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === qrCodes.length ? [] : qrCodes.map(q => q._id));

  const handleDuplicate = (id) => {
    const original = qrCodes.find(q => q._id === id);
    setRenameModal({ open: true, id, defaultTitle: original ? `${original.title} (Copy)` : 'New QR Code' });
    setActiveMenu(null);
  };

  const confirmDuplicate = async (newTitle) => {
    const { id } = renameModal;
    setRenameModal({ open: false, id: null, defaultTitle: '' });
    if (!newTitle?.trim()) return;
    setDuplicatingId(id);
    try {
      await qrCodeAPI.duplicate(id, { title: newTitle.trim() });
      toast.success('Duplicated successfully');
      fetchQRCodes();
    } catch {
      toast.error('Failed to duplicate');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDownload = async (id, title) => {
    try {
      const response = await qrCodeAPI.download(id, 'png', 1000);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch { toast.error('Download failed'); }
    setActiveMenu(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Rename Modal for Duplicate */}
      <AnimatePresence>
        {renameModal.open && (
          <RenameModal
            isOpen={renameModal.open}
            defaultValue={renameModal.defaultTitle}
            onConfirm={confirmDuplicate}
            onCancel={() => setRenameModal({ open: false, id: null, defaultTitle: '' })}
          />
        )}
      </AnimatePresence>

      {/* Location Panel */}
      <LocationPanel panel={locationPanel} onClose={closeLocationPanel} />

      {/* Top Bar */}
      <div className="flex items-center gap-[1.2vw] bg-white py-[0.5vw] px-[1vw] rounded-[0.6vw] border border-slate-200 mb-[0.8vw] flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-lg">
            <FiGrid className="text-blue-600 text-[1.1vw]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[0.85vw] font-bold text-slate-800 leading-none">{pagination.total}</span>
            <span className="text-[0.65vw] text-slate-400 font-medium uppercase mt-0.5">QR Codes</span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-100 mx-2" />

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <label className="text-[0.6vw] font-bold text-slate-400 uppercase ml-1">Type</label>
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <FiFilter className="text-[0.8vw] text-slate-400" />
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPagination(p => ({...p, page: 1})); }}
                className="text-[0.75vw] font-medium text-slate-600 bg-transparent focus:outline-none min-w-[7vw] cursor-pointer">
                {qrTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[0.6vw] font-bold text-slate-400 uppercase ml-1">Sort By</label>
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <FiActivity className="text-[0.8vw] text-slate-400" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="text-[0.75vw] font-medium text-slate-600 bg-transparent focus:outline-none min-w-[8vw] cursor-pointer">
                {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-0.5">
          <button onClick={() => setViewMode('grid')}
            className={`p-[0.35vw] rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <FiGrid className="text-[1vw]" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-[0.35vw] rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <FiList className="text-[1vw]" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between bg-blue-50 border border-blue-100 py-[0.5vw] px-[1vw] rounded-[0.6vw] mb-[0.8vw] shadow-sm"
          >
            <div className="flex items-center gap-[1vw]">
              {!bulkDeleting && (
                <>
                  <div className="flex items-center gap-[0.5vw]">
                    <input type="checkbox" checked={selectedIds.length === qrCodes.length} onChange={toggleSelectAll}
                      className="w-[1vw] h-[1vw] rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span className="text-[0.8vw] font-bold text-blue-800">{selectedIds.length} items selected</span>
                  </div>
                  <button onClick={() => setSelectedIds([])} className="text-[0.7vw] text-blue-600 hover:underline font-medium">Deselect all</button>
                </>
              )}
              {bulkDeleting && (
                <span className="text-[0.8vw] font-bold text-red-600">Deleting {selectedIds.length} items...</span>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-[0.4vw] bg-red-600 text-white px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {bulkDeleting
                ? <><div className="animate-spin rounded-full h-[0.9vw] w-[0.9vw] border-2 border-white border-t-transparent" /> Deleting...</>
                : <><FiTrash2 className="text-[0.9vw]" /> Delete Selected</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Grid / List */}
      <div className="flex-1 overflow-y-auto pr-[0.4vw] custom-scrollbar mb-[0.6vw]">
        {loading ? (
          <div className="flex items-center justify-center h-[30vh]">
            <div className="animate-spin rounded-full h-[2.5vw] w-[2.5vw]" style={{ borderBottom: '2px solid #2563eb' }} />
          </div>
        ) : qrCodes.length > 0 ? (
          <motion.div layout className={viewMode === 'grid' ? 'grid grid-cols-4 gap-[1vw]' : 'space-y-[0.6vw]'}>
            <AnimatePresence mode="popLayout">
              {qrCodes.map((qr) => (
                <QRCodeCard
                   key={qr._id}
                   qr={qr}
                   viewMode={viewMode}
                   navigate={navigate}
                   activeMenu={activeMenu}
                   setActiveMenu={setActiveMenu}
                   handleDownload={handleDownload}
                   handleDuplicate={handleDuplicate}
                   handleDelete={handleDelete}
                   isSelected={selectedIds.includes(qr._id)}
                   toggleSelect={toggleSelect}
                   lastLocation={qrLocationMap[qr._id] || null}
                   onLocationClick={handleLocationClick}
                   isDuplicating={duplicatingId === qr._id}
                   isDeleting={deletingId === qr._id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-[5vw] bg-white rounded-[0.75vw] border border-slate-200">
            <FiActivity className="mx-auto text-[4vw] text-slate-100 mb-[1vw]" />
            <p className="text-[1.1vw] font-semibold text-slate-800">No results found</p>
            <p className="text-[0.85vw] text-slate-500 mt-1">Try adjusting your filters or create a new QR code.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-slate-100 py-[0.45vw] px-[1.2vw] flex items-center justify-between flex-shrink-0 rounded-b-[0.6vw] shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <div className="text-[0.7vw] text-slate-400 font-medium">
          Showing <span className="text-slate-700 font-bold">{qrCodes.length}</span> of <span className="text-slate-700 font-bold">{pagination.total}</span>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-[0.35vw]">
            <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
              className="p-[0.35vw] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100 cursor-pointer">
              <FiChevronLeft className="text-[0.85vw]" />
            </button>
            <div className="flex items-center gap-[0.2vw] mx-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setPagination(p => ({ ...p, page }))}
                  className={`min-w-[1.8vw] h-[1.8vw] text-[0.75vw] font-bold rounded-lg cursor-pointer transition-all
                    ${pagination.page === page ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {page}
                </button>
              ))}
            </div>
            <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}
              className="p-[0.35vw] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100 cursor-pointer">
              <FiChevronRight className="text-[0.85vw]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQRCodes;