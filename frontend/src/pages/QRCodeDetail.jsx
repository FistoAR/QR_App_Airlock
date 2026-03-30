import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from '../components/UI/Toast';
import { useConfirm } from '../components/UI/ConfirmDialog';

import {
  FiArrowLeft, FiDownload, FiEdit2, FiTrash2, FiCopy,
  FiExternalLink, FiMapPin, FiBarChart2, FiWifi, FiMail,
  FiMessageSquare, FiLink, FiUser, FiFileText, FiUpload, FiList,
  FiToggleLeft, FiToggleRight, FiCalendar, FiTag, FiSave, FiX, FiActivity,
  FiCheckCircle, FiLock,
} from 'react-icons/fi';
import { qrCodeAPI, analyticsAPI } from '../services/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import QRPreview from '../components/QRCode/QRPreview';
import QRCustomizer from '../components/QRCode/QRCustomizer';
import FileUploadForm from '../components/ContentForms/FileUploadForm';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';

const TYPE_META = {
  url:       { icon: FiLink,          label: 'URL',           color: '#3b82f6' },
  vcard:     { icon: FiUser,          label: 'Contact Card',  color: '#22c55e' },
  text:      { icon: FiFileText,      label: 'Plain Text',    color: '#a855f7' },
  file:      { icon: FiUpload,        label: 'File Upload',   color: '#f97316' },
  multilink: { icon: FiList,          label: 'Multi-Link',    color: '#ec4899' },
  wifi:      { icon: FiWifi,          label: 'WiFi',          color: '#06b6d4' },
  email:     { icon: FiMail,          label: 'Email',         color: '#ef4444' },
  sms:       { icon: FiMessageSquare, label: 'SMS',           color: '#eab308' },
  location:  { icon: FiMapPin,        label: 'Location',      color: '#14b8a6' },
};

const QRCodeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [qr, setQR] = useState(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState('content'); // 'content' or 'customization'
  const [analytics, setAnalytics] = useState(null);
  
  const methods = useForm({
    defaultValues: {
      title: '',
      description: '',
      content: {},
      customization: {},
      isActive: true
    }
  });

  const { reset, watch, handleSubmit } = methods;
  const editData = watch();
  const customization = watch('customization');

  useEffect(() => {
    fetchQR();
  }, [id]);

  const fetchQR = async () => {
    setLoading(true);
    try {
      const res = await qrCodeAPI.getOne(id);
      const data = res.data.data;
      setQR(data);
      reset({
        title: data.title,
        description: data.description || '',
        content: { ...data.content },
        customization: { ...data.customization },
        isActive: data.isActive,
      });
      if (data.isDynamic) {
        fetchAnalytics();
      }
    } catch {
      toast.error('Failed to load QR code');
      navigate('/qrcodes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsAPI.getQRAnalytics(id);
      setAnalytics(res.data.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await qrCodeAPI.update(id, editData);
      setQR(res.data.data);
      setIsEditing(false);
      toast.success('Updated successfully!');
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete QR Code?',
      message: `"${qr?.title}" will be permanently deleted along with all its scan history and analytics.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await qrCodeAPI.delete(id);
      toast.success('QR code deleted');
      navigate('/qrcodes');
    } catch {
      toast.error('Failed to delete');
    }
  };


  const handleDownload = async (format = 'png') => {
    try {
      const response = await qrCodeAPI.download(id, format, 1000);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${qr.title}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch {
      toast.error('Download failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-[3vw] w-[3vw] border-b-2 border-blue-600" />
    </div>
  );

  if (!qr) return null;

  const meta = TYPE_META[qr.type] || { icon: FiLink, label: qr.type, color: '#6b7280' };
  const TypeIcon = meta.icon;
  const imgSrc = qr.qrImageUrl ? (qr.qrImageUrl.startsWith('http') ? qr.qrImageUrl : `${BACKEND_URL}${qr.qrImageUrl}`) : null;

  const inputClass = "w-full px-[0.75vw] py-[0.5vw] text-[0.85vw] border border-slate-200 rounded-[0.4vw] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 mt-1";
  const labelClass = "text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-[1vw] flex-shrink-0">
        <div className="flex items-center gap-[1vw]">
          <Link to="/qrcodes" className="p-[0.6vw] hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors">
            <FiArrowLeft className="text-[1.2vw]" />
          </Link>
          <div className="flex items-center gap-[0.75vw]">
            <div className="w-[2vw] h-[2vw] rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: meta.color }}>
              <TypeIcon className="text-[1vw]" />
            </div>
            <div>
              <h1 className="text-[1.2vw] font-bold text-slate-800 leading-none">{qr.title}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[0.75vw]">
          {isEditing ? (
            // Only show Save/Cancel if it's dynamic
            (qr.isDynamic ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-[1vw] py-[0.5vw] bg-white text-slate-600 border border-slate-200 rounded-lg text-[0.85vw] font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <FiX /> Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-[1vw] py-[0.5vw] bg-green-600 text-white rounded-lg text-[0.85vw] font-semibold hover:bg-green-700 transition-all cursor-pointer shadow-md shadow-green-100 disabled:opacity-50"
                >
                  {updating ? <div className="animate-spin rounded-full h-[0.8vw] w-[0.8vw] border-b-2 border-white" /> : <FiSave />}
                  Save Changes
                </button>
              </>
            ) : null)
          ) : (
            // Only show Edit button for dynamic QRs
            qr.isDynamic ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-[1vw] py-[0.5vw] bg-blue-600 text-white rounded-lg text-[0.85vw] font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-100"
              >
                <FiEdit2 /> Edit Code
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-[1vw] py-[0.45vw] bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[0.8vw] font-semibold cursor-not-allowed select-none">
                <FiLock className="text-[0.9vw]" /> Static QR — Locked
              </div>
            )
          )}
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <button onClick={handleDelete} className="p-[0.6vw] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors">
            <FiTrash2 className="text-[1.1vw]" />
          </button>
        </div>
      </div>

      {/* Split Layout: Fix to screen, independently scrollable */}
      <div className="flex-1 flex gap-[1.2vw] overflow-hidden">
        
        {/* Left: Preview & Stats (Fixed/Compact) */}
        <div className="w-[20vw] flex flex-col gap-[0.8vw] flex-shrink-0">
          <div className="bg-white rounded-[0.8vw] border border-slate-200 p-[0.6vw] shadow-sm ">
            <div className="bg-slate-50 rounded-[0.6vw] aspect-square w-[90%] mx-auto flex items-center justify-center mb-[0.4vw] relative group overflow-hidden">
              {isEditing ? (
                <div className="bg-white p-[0.3vw] rounded-[0.4vw] w-full flex items-center justify-center">
                  <QRPreview 
                    customization={{...editData.customization, previewSize: '100%'}} 
                    content={editData.content} 
                    type={qr.type}
                    isDynamic={qr.isDynamic}
                  />
                </div>
              ) : imgSrc ? (
                <img src={imgSrc} alt="QR Preview" className={`w-full h-full object-contain p-[0.3vw] ${
                  qr.customization?.frame?.style === 'banner' ? 'rounded-[12px]' : 
                  qr.customization?.frame?.style === 'rounded' ? 'rounded-[12px]' :
                  qr.customization?.frame?.style === 'simple' ? 'rounded-[6px]' : 'rounded-[0.4vw]'
                }`} />
              ) : (
                <TypeIcon className="text-[3vw] text-slate-200" />
              )}
              {!isEditing && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => window.open(qr.shortUrl, '_blank')} className="bg-white p-2 rounded-full cursor-pointer hover:scale-110 transition-transform"><FiExternalLink className="text-blue-600" /></button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-[0.4vw]">
               {['png', 'jpeg', 'webp'].map(fmt => (
                 <button 
                    key={fmt} 
                    onClick={() => handleDownload(fmt)}
                    className="flex items-center justify-center gap-1.2 py-[0.35vw] rounded-md border border-slate-100 text-[0.6vw] font-bold text-slate-500 uppercase hover:bg-slate-50 cursor-pointer transition-colors"
                 >
                    <FiDownload className="text-[0.7vw]" /> {fmt}
                 </button>
               ))}
            </div>
          </div>

          <div className="bg-white rounded-[0.8vw] border border-slate-200 p-[0.75vw] flex-1 overflow-y-auto custom-scrollbar shadow-sm">
             <h3 className="text-[0.7vw] font-bold text-slate-800 mb-[0.5vw] flex items-center gap-2">
                <FiBarChart2 className="text-blue-500" /> Activity
             </h3>
             <div className="space-y-[0.4vw]">
                {[
                    { label: 'Total Scans', value: qr.scanCount, icon: FiActivity, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Created On', value: format(new Date(qr.createdAt), 'MMM d, yyyy'), icon: FiCalendar, color: 'bg-green-50 text-green-600' },
                ].map(stat => (
                    <div key={stat.label} className="flex flex-col gap-0.2 p-[0.4vw] bg-slate-50 rounded-lg">
                        <span className="text-[0.5vw] font-bold text-slate-400 uppercase leading-tight">{stat.label}</span>
                        <span className="text-[0.75vw] font-bold text-slate-800 truncate">{stat.value}</span>
                    </div>
                ))}
             </div>
          </div>

        </div>

        {/* Right: Content Forms (Fixed Height Window + Scroll) */}
        <div className="flex-1 bg-white rounded-[0.8vw] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
            <div className="px-[1.2vw] py-[0.8vw] border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-[0.9vw] font-bold text-slate-800 flex items-center gap-2">
                        {isEditing ? <FiEdit2 className="text-blue-500" /> : (qr.isDynamic ? <FiFileText className="text-blue-500" /> : <FiLock className="text-amber-500" />)}
                        {isEditing ? 'Editing Mode' : 'Content Details'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {!qr.isDynamic && (
                            <div className="px-[0.6vw] py-[0.15vw] bg-amber-100 text-amber-700 rounded-full text-[0.6vw] font-bold uppercase tracking-wider flex items-center gap-1">
                                <FiLock className="text-[0.65vw]" /> Read Only
                            </div>
                        )}
                        <div className="px-[0.6vw] py-[0.15vw] bg-blue-100 text-blue-700 rounded-full text-[0.6vw] font-bold uppercase tracking-wider">
                            {qr.type}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto custom-scrollbar flex-1">
                <AnimatePresence mode="wait">
                    {isEditing ? (
                        <div key="edit" className="flex flex-col h-full">
                            {/* Tab Headers */}
                            <div className="flex items-center gap-[1.5vw] px-[1.2vw] py-[0.75vw] bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
                                <button
                                    onClick={() => setEditTab('content')}
                                    className={`text-[0.8vw] font-bold py-[0.4vw] px-[1vw] rounded-lg transition-all ${editTab === 'content' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                >
                                    QR Content
                                </button>
                                <button
                                    onClick={() => setEditTab('customization')}
                                    className={`text-[0.8vw] font-bold py-[0.4vw] px-[1vw] rounded-lg transition-all ${editTab === 'customization' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                >
                                    Customization
                                </button>
                            </div>

                            <motion.div
                                key={editTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-[1.2vw] pb-[2vw]"
                            >
                                <FormProvider {...methods}>
                                {editTab === 'content' ? (
                                    <div className="space-y-[1.5vw]">
                                        {/* General Info */}
                                        <div className="grid grid-cols-2 gap-[1vw]">
                                            <div className="col-span-2">
                                                <label className={labelClass}>QR Code Title</label>
                                                <input 
                                                    type="text" 
                                                    className={inputClass} 
                                                    value={editData.title}
                                                    onChange={e => methods.setValue('title', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <hr className="border-slate-100" />

                                        {/* Type Specific Fields */}
                                        <div>
                                            <h3 className="text-[0.8vw] font-bold text-slate-800 mb-[0.75vw]">QR Content</h3>
                                            <div className="grid grid-cols-2 gap-[1vw]">
                                                {qr.type === 'url' && (
                                                    <>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Website URL</label>
                                                            <input type="url" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.target} onChange={e => methods.setValue('content.target', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {qr.type === 'vcard' && (
                                                    <>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Full Name</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.firstName} onChange={e => methods.setValue('content.firstName', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Job Title</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.title} onChange={e => methods.setValue('content.title', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Organization</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.organization} onChange={e => methods.setValue('content.organization', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Mobile Number</label>
                                                            <input type="tel" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.mobile} onChange={e => methods.setValue('content.mobile', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Office Phone</label>
                                                            <input type="tel" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.phone} onChange={e => methods.setValue('content.phone', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Email Address</label>
                                                            <input type="email" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.email} onChange={e => methods.setValue('content.email', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Website</label>
                                                            <input type="url" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.website} onChange={e => methods.setValue('content.website', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>LinkedIn Profile</label>
                                                            <input type="url" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.linkedin} onChange={e => methods.setValue('content.linkedin', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Address</label>
                                                            <textarea readOnly={!qr.isDynamic} className={`${inputClass} h-[3vw] resize-none ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={typeof editData.content.address === 'object' ? editData.content.address?.street : editData.content.address} onChange={e => methods.setValue('content.address.street', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {qr.type === 'text' && (
                                                    <div className="col-span-2">
                                                        <label className={labelClass}>Text Content</label>
                                                        <textarea readOnly={!qr.isDynamic} className={`${inputClass} h-[8vw] resize-none ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.content} onChange={e => methods.setValue('content.content', e.target.value)} />
                                                    </div>
                                                )}
                                                {qr.type === 'email' && (
                                                    <>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Email Address</label>
                                                            <input type="email" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.address || editData.content.email || editData.content.to || ''} onChange={e => methods.setValue('content.address', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Subject</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.subject} onChange={e => methods.setValue('content.subject', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Message Body</label>
                                                            <textarea readOnly={!qr.isDynamic} className={`${inputClass} h-[5vw] resize-none ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.body} onChange={e => methods.setValue('content.body', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {qr.type === 'sms' && (
                                                    <>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Phone Number</label>
                                                            <input type="tel" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.phone} onChange={e => methods.setValue('content.phone', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Message</label>
                                                            <textarea readOnly={!qr.isDynamic} className={`${inputClass} h-[5vw] resize-none ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.message} onChange={e => methods.setValue('content.message', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {qr.type === 'wifi' && (
                                                    <>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Network SSID</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.ssid} onChange={e => methods.setValue('content.ssid', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Password</label>
                                                            <input type="password" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.password} onChange={e => methods.setValue('content.password', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Security Type</label>
                                                            <select disabled={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.encryption} onChange={e => methods.setValue('content.encryption', e.target.value)}>
                                                                <option value="WPA">WPA/WPA2</option>
                                                                <option value="WEP">WEP</option>
                                                                <option value="nopass">No Password</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-1 flex items-center pt-[1vw]">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    disabled={!qr.isDynamic}
                                                                    checked={editData.content.hidden} 
                                                                    onChange={e => methods.setValue('content.hidden', e.target.checked)} 
                                                                />
                                                                <span className="text-[0.7vw] font-bold text-slate-600 uppercase">Hidden Network</span>
                                                            </label>
                                                        </div>
                                                    </>
                                                )}
                                                {qr.type === 'location' && (
                                                    <>
                                                        <div className="col-span-2">
                                                            <label className={labelClass}>Address or Search Term</label>
                                                            <textarea readOnly={!qr.isDynamic} className={`${inputClass} h-[4vw] resize-none ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.address} onChange={e => methods.setValue('content.address', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Postal Code (Optional)</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.postalCode} onChange={e => methods.setValue('content.postalCode', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className={labelClass}>Location Name (Optional)</label>
                                                            <input type="text" readOnly={!qr.isDynamic} className={`${inputClass} ${!qr.isDynamic ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} value={editData.content.name} onChange={e => methods.setValue('content.name', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {(qr.type === 'file' || qr.type === 'document' || qr.type === 'media') && (
                                                    <div className="col-span-2">
                                                        {editData.content?.url && (
                                                            <div className="mb-[1vw] p-[0.75vw] bg-blue-50 border border-blue-100 rounded-[0.5vw] flex items-center gap-2">
                                                                <FiCheckCircle className="text-blue-500 text-[1vw] shrink-0" />
                                                                <p className="text-[0.75vw] text-blue-700">
                                                                    Current file: <strong>{editData.content.fileName || 'Uploaded file'}</strong>. Upload a new file below to replace it.
                                                                </p>
                                                            </div>
                                                        )}
                                                        <FileUploadForm type={qr.type === 'file' ? 'media' : qr.type} />
                                                    </div>
                                                )}
                                                {qr.type === 'multilink' && (
                                                    <>
                                                        <div className="col-span-2 bg-slate-50 p-[1vw] rounded-[0.6vw]">
                                                            <h5 className="text-[0.8vw] font-bold text-slate-700 mb-2">Profile Info</h5>
                                                            <div className="grid grid-cols-2 gap-[0.75vw]">
                                                                <div className="col-span-2">
                                                                    <label className={labelClass}>Page Title</label>
                                                                    <input type="text" className={inputClass} value={editData.content.title} onChange={e => methods.setValue('content.title', e.target.value)} />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className={labelClass}>Bio</label>
                                                                    <textarea className={`${inputClass} h-[3vw] resize-none`} value={editData.content.description} onChange={e => methods.setValue('content.description', e.target.value)} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="text-[0.8vw] font-bold text-slate-700">Links ({editData.content.links?.length || 0})</h5>
                                                                <button 
                                                                    onClick={() => {
                                                                        const links = editData.content.links || [];
                                                                        methods.setValue('content.links', [...links, {title: '', url: '', order: links.length}]);
                                                                    }}
                                                                    className="text-[0.7vw] text-blue-600 font-bold hover:underline"
                                                                >+ Add Link</button>
                                                            </div>
                                                            <div className="space-y-[0.5vw]">
                                                                {(editData.content.links || []).map((link, idx) => (
                                                                    <div key={idx} className="flex items-start gap-2 p-[0.75vw] bg-white border border-slate-200 rounded-[0.5vw]">
                                                                        <div className="flex-1 space-y-2">
                                                                            <input 
                                                                                placeholder="Link Title" 
                                                                                className={inputClass} 
                                                                                value={link.title} 
                                                                                onChange={e => {
                                                                                    const newLinks = [...editData.content.links];
                                                                                    newLinks[idx] = {...newLinks[idx], title: e.target.value};
                                                                                    methods.setValue('content.links', newLinks);
                                                                                }} 
                                                                            />
                                                                            <input 
                                                                                placeholder="URL (https://...)" 
                                                                                className={inputClass} 
                                                                                value={link.url} 
                                                                                onChange={e => {
                                                                                    const newLinks = [...editData.content.links];
                                                                                    newLinks[idx] = {...newLinks[idx], url: e.target.value};
                                                                                    methods.setValue('content.links', newLinks);
                                                                                }} 
                                                                            />
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                const newLinks = editData.content.links.filter((_, i) => i !== idx);
                                                                                methods.setValue('content.links', newLinks);
                                                                            }}
                                                                            className="p-1 text-slate-400 hover:text-red-500"
                                                                        >
                                                                            <FiX />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <hr className="border-slate-100" />

                                        <div className="bg-slate-50 p-[1vw] rounded-[0.8vw]">
                                            <h3 className="text-[0.8vw] font-bold text-slate-800 mb-[1vw] flex items-center gap-2">
                                                <FiActivity className="text-blue-500" /> Status Settings
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <label className={labelClass}>Enable / Disable QR</label>
                                                <div 
                                                    onClick={() => methods.setValue('isActive', !editData.isActive)}
                                                    className={`relative w-[2.8vw] h-[1.4vw] rounded-full cursor-pointer transition-colors duration-200 ${editData.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                                                >
                                                    <div 
                                                        className={`absolute top-[0.2vw] left-[0.2vw] w-[1vw] h-[1vw] bg-white rounded-full shadow-sm transition-transform duration-200 ${editData.isActive ? 'translate-x-[1.4vw]' : 'translate-x-0'}`}
                                                    />
                                                </div>
                                                <span className={`text-[0.7vw] font-bold ${editData.isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    {editData.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <QRCustomizer />
                                )}
                                </FormProvider>
                            </motion.div>
                        </div>
                    ) : (
                        <motion.div
                            key="view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-[1.2vw] space-y-[1.5vw]"
                        >
                            <div>
                                <h4 className={`${labelClass} mb-2`}>Recent Scans by Location</h4>
                                <div className="grid grid-cols-1 gap-[0.5vw]">
                                    {analytics?.recentScans?.length > 0 ? (
                                        analytics.recentScans.map((scan, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-[0.75vw] bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[1.8vw] h-[1.8vw] bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                        <FiMapPin className="text-[0.8vw]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.8vw] font-bold text-slate-700">
                                                            {scan.location?.city ? `${scan.location.city}, ` : ''}{scan.location?.country || 'Unknown Location'}
                                                        </span>
                                                        <span className="text-[0.6vw] text-slate-400">
                                                            {scan.device?.browser || 'Unknown Browser'} on {scan.device?.os || 'Unknown OS'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[0.7vw] font-medium text-slate-500">
                                                        {format(new Date(scan.createdAt), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : qr.isDynamic ? (
                                        <div className="col-span-2 p-[1vw] bg-slate-50 rounded-lg border border-slate-100 text-center">
                                            <p className="text-[0.75vw] text-slate-400 italic">No scans tracked yet.</p>
                                        </div>
                                    ) : (
                                        <div className="col-span-2 p-[1vw] bg-orange-50 rounded-lg border border-orange-100">
                                            <p className="text-[0.75vw] text-orange-700 flex items-center gap-2">
                                                <FiActivity className="text-orange-500" /> Static QR codes do not support location tracking.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className={`${labelClass} mb-2`}>Raw Content Data</h4>
                                <div className="grid grid-cols-2 gap-[0.75vw]">
                                    {Object.entries(qr.content || {}).map(([key, value]) => {
                                        const displayValue = typeof value === 'boolean' 
                                            ? (value ? 'Yes' : 'No') 
                                            : (typeof value === 'object' && value !== null 
                                                ? (Array.isArray(value) ? `${value.length} Items` : 'Object Data') 
                                                : (value || '—'));
                                        
                                        return (
                                            <div key={key} className="flex flex-col p-[0.75vw] bg-white border border-slate-100 rounded-lg">
                                                <span className="text-[0.6vw] font-bold text-slate-400 uppercase">{key}</span>
                                                <span className="text-[0.8vw] text-slate-800 break-all font-medium truncate">{displayValue}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-[1vw]">
                                <div className="p-[1vw] border border-slate-100 rounded-lg">
                                    <h4 className={labelClass}>Colors</h4>
                                    <div className="flex gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: qr.customization?.foregroundColor }} />
                                            <span className="text-[0.7vw] font-mono text-slate-500 uppercase">{qr.customization?.foregroundColor}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: qr.customization?.backgroundColor }} />
                                            <span className="text-[0.7vw] font-mono text-slate-500 uppercase">{qr.customization?.backgroundColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-[1vw] border border-slate-100 rounded-lg">
                                    <h4 className={labelClass}>Style</h4>
                                    <p className="text-[0.8vw] font-bold text-slate-700 mt-1 capitalize">{qr.customization?.dotStyle || 'Square'} Dots</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDetail;
