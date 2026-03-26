import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBarChart2, FiTrendingUp, FiTrendingDown, FiGrid,
  FiActivity, FiMapPin, FiMonitor, FiSmartphone,
} from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { analyticsAPI, qrCodeAPI } from '../services/api';
import { format, subDays, formatDistanceToNow } from 'date-fns';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const flagEmoji = (cc) => {
  if (!cc || cc.length !== 2) return '🌍';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
};

const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];

/* ─── Analytics ───────────────────────────────────────────────────────── */
const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalQRCodes: 0,
    activeQRCodes: 0,
    totalScans: 0,
    recentScansData: [],
    topQRCodes: [],
    recentScans: [],
    topLocations: [],
    qrLocationMap: {},
  });
  const [recentQRCodes, setRecentQRCodes] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, qrRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        qrCodeAPI.getAll({ limit: 5, sort: '-createdAt' }),
      ]);
      setDashboardData(dashRes.data.data);
      setRecentQRCodes(qrRes.data.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const scanData = dashboardData.recentScansData?.find(d => d._id === dateStr);
    return { date: format(date, 'MMM dd'), scans: scanData?.count || 0 };
  });

  const StatCard = ({ title, value, icon: Icon, change, changeType, color }) => (
    <div className="bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-[0.75vw]">
        <div className="w-[2.75vw] h-[2.75vw] flex items-center justify-center rounded-[0.5vw]" style={{ backgroundColor: color }}>
          <Icon className="text-white text-[1.25vw]" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-[0.25vw] text-[0.75vw] ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-[0.8vw] text-slate-500 mb-[0.25vw]">{title}</h3>
      <p className="text-[1.75vw] font-bold text-slate-800">{value.toLocaleString()}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-[3vw] w-[3vw]" style={{ borderBottom: '2px solid #2563eb' }} />
      </div>
    );
  }

  const recentScans = dashboardData.recentScans || [];
  const topLocations = dashboardData.topLocations || [];
  const maxLocCount = topLocations[0]?.count || 1;

  return (
    <div className="space-y-[1.5vw] h-full overflow-y-auto pr-1 custom-scrollbar">

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-[1vw]">
        <StatCard title="Total QR Codes"   value={dashboardData.totalQRCodes}                              icon={FiGrid}       color="#3b82f6" />
        <StatCard title="Active QR Codes"  value={dashboardData.activeQRCodes}                             icon={FiActivity}   color="#10b981" />
        <StatCard title="Total Scans"      value={dashboardData.totalScans}    change={12.5} changeType="up" icon={FiBarChart2}  color="#8b5cf6" />
        <StatCard title="This Week Scans"  value={chartData.reduce((s, d) => s + d.scans, 0)} change={8.2} changeType="up" icon={FiTrendingUp} color="#f59e0b" />
      </div>

      {/* ── Chart + Top Performers ── */}
      <div className="grid grid-cols-12 gap-[1vw]">
        {/* Scan Trend */}
        <div className="col-span-8 bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-[1vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">Scan Trends</h2>
            <span className="text-[0.7vw] text-slate-400">Last 7 days</span>
          </div>
          <div className="h-[18vw]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: '0.7vw', fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: '0.7vw', fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '0.75vw', borderRadius: '0.4vw', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing */}
        <div className="col-span-4 bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
          <h2 className="text-[1vw] font-semibold text-slate-800 mb-[1vw]">Top Performing</h2>
          <div className="space-y-[0.75vw]">
            {dashboardData.topQRCodes?.slice(0, 5).map((qr, i) => (
              <div key={qr._id} className="flex items-center gap-[0.75vw]">
                <span className="w-[1.5vw] h-[1.5vw] rounded-full bg-slate-50 flex items-center justify-center text-[0.7vw] font-semibold text-slate-600 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8vw] font-medium text-slate-800 truncate">{qr.title}</p>
                  <div className="flex items-center gap-[0.3vw] text-[0.65vw] text-slate-400">
                    <span>{qr.scanCount} scans</span>
                    {qr.lastScanLocation?.country && (
                      <>
                        <span>·</span>
                        <span>{flagEmoji(qr.lastScanLocation.countryCode)}</span>
                        <span>{qr.lastScanLocation.city || qr.lastScanLocation.country}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-[4vw] h-[0.3vw] bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: '#3b82f6', width: `${(qr.scanCount / (dashboardData.topQRCodes[0]?.scanCount || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
            {!dashboardData.topQRCodes?.length && (
              <p className="text-center text-[0.8vw] text-slate-300 py-[2vw]">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Locations  +  Recent Scan Feed ── */}
      <div className="grid grid-cols-12 gap-[1vw]">

        {/* Top Locations */}
        <div className="col-span-5 bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
          <div className="flex items-center gap-[0.5vw] mb-[1vw]">
            <FiMapPin className="text-blue-500 text-[1.1vw]" />
            <h2 className="text-[1vw] font-semibold text-slate-800">Top Scan Locations</h2>
          </div>

          {topLocations.length === 0 ? (
            <div className="text-center py-[3vw]">
              <FiMapPin className="mx-auto text-[2.5vw] text-slate-100 mb-2" />
              <p className="text-[0.8vw] text-slate-400">No location data yet</p>
              <p className="text-[0.65vw] text-slate-300 mt-1">Scan your dynamic QR codes to start tracking</p>
            </div>
          ) : (
            <div className="space-y-[0.75vw]">
              {topLocations.map((loc, idx) => (
                <div key={`${loc.country}-${idx}`} className="flex items-center gap-[0.75vw]">
                  {/* Rank */}
                  <span className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center text-[0.6vw] font-black shrink-0"
                    style={{ backgroundColor: `${PALETTE[idx]}22`, color: PALETTE[idx] }}>
                    {idx + 1}
                  </span>
                  {/* Flag */}
                  <span className="text-[1.1vw] w-[1.3vw] text-center shrink-0">{flagEmoji(loc.countryCode)}</span>
                  {/* Country */}
                  <span className="text-[0.8vw] font-semibold text-slate-700 w-[4.5vw] shrink-0">{loc.country}</span>
                  {/* Bar */}
                  <div className="flex-1 bg-slate-100 rounded-full h-[0.5vw] overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(loc.count / maxLocCount) * 100}%`, backgroundColor: PALETTE[idx] }} />
                  </div>
                  {/* Count */}
                  <span className="text-[0.75vw] font-bold text-slate-600 w-[2.5vw] text-right shrink-0">{loc.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cities subtitle */}
          {topLocations.length > 0 && (
            <div className="mt-[1vw] pt-[0.75vw] border-t border-slate-100">
              <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.5vw]">Cities spotted</p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {topLocations.flatMap(l => l.cities || []).filter(Boolean).slice(0, 10).map((city, i) => (
                  <span key={i} className="px-[0.5vw] py-[0.2vw] bg-slate-50 border border-slate-100 rounded-full text-[0.65vw] text-slate-500">{city}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Scan Feed */}
        <div className="col-span-7 bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-[1vw]">
            <h2 className="text-[1vw] font-semibold text-slate-800">Recent Scans</h2>
            <span className="text-[0.7vw] text-slate-400">Last 15</span>
          </div>

          {recentScans.length === 0 ? (
            <div className="text-center py-[3vw]">
              <FiActivity className="mx-auto text-[2.5vw] text-slate-100 mb-2" />
              <p className="text-[0.8vw] text-slate-400">No scans recorded yet</p>
            </div>
          ) : (
            <div className="space-y-[0.5vw] max-h-[20vw] overflow-y-auto custom-scrollbar pr-1">
              {recentScans.map((scan, idx) => {
                const loc = scan.location || {};
                const city = loc.city && loc.city !== 'Unknown' ? loc.city : null;
                const country = loc.country && loc.country !== 'Unknown' ? loc.country : null;
                const locLabel = [city, country].filter(Boolean).join(', ') || 'Unknown Location';
                const flag = flagEmoji(loc.countryCode);
                const isMobile = scan.device?.type === 'mobile';

                return (
                  <div key={idx} className="flex items-center gap-[0.75vw] p-[0.6vw] bg-slate-50 rounded-[0.4vw] hover:bg-blue-50/40 transition-colors border border-transparent hover:border-blue-100">
                    <div className="w-[2vw] h-[2vw] rounded-full bg-white border border-slate-200 flex items-center justify-center text-[1vw] shrink-0 shadow-sm">
                      {flag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.78vw] font-semibold text-slate-700 truncate">{locLabel}</p>
                      <p className="text-[0.62vw] text-slate-400 truncate">
                        {scan.qrCode?.title || 'QR Code'} · {scan.device?.browser || 'Browser'} on {scan.device?.os || 'OS'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.6vw] text-slate-400">
                        {scan.createdAt ? formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true }) : ''}
                      </p>
                      <div className="flex justify-end mt-[0.1vw]">
                        {isMobile ? <FiSmartphone className="text-[0.75vw] text-slate-300" /> : <FiMonitor className="text-[0.75vw] text-slate-300" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent QR Codes with location ── */}
      <div className="bg-white rounded-[0.75vw] p-[1.25vw] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-[1vw]">
          <h2 className="text-[1vw] font-semibold text-slate-800">Recent QR Codes</h2>
          <Link to="/qrcodes" className="text-[0.8vw] text-blue-600 hover:text-blue-700 font-medium">Manage QR Codes →</Link>
        </div>
        <div className="grid grid-cols-5 gap-[1vw]">
          {recentQRCodes.slice(0, 5).map(qr => {
            const lastLoc = dashboardData.qrLocationMap?.[qr._id];
            const city = lastLoc?.city && lastLoc.city !== 'Unknown' ? lastLoc.city : null;
            const country = lastLoc?.country && lastLoc.country !== 'Unknown' ? lastLoc.country : null;
            const locDisplay = city || country;
            return (
              <Link key={qr._id} to={`/qrcodes/${qr._id}`}
                className="p-[0.75vw] border border-slate-100 rounded-[0.5vw] bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-100 transition-colors">
                <h4 className="text-[0.8vw] font-medium text-slate-800 truncate mb-1">{qr.title}</h4>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.65vw] text-slate-400 uppercase font-semibold">{qr.type}</span>
                  <span className="text-[0.7vw] font-bold text-slate-700">{qr.scanCount} scans</span>
                </div>
                {locDisplay ? (
                  <div className="flex items-center gap-[0.3vw] mt-[0.3vw]">
                    <span className="text-[0.85vw]">{flagEmoji(lastLoc?.countryCode)}</span>
                    <span className="text-[0.6vw] text-slate-500 truncate">{locDisplay}</span>
                  </div>
                ) : (
                  <span className="text-[0.6vw] text-slate-300 italic">No scans yet</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
