import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiSmartphone, FiGlobe, FiMapPin, FiDownload, FiFile, FiLink, FiExternalLink, FiLinkedin, FiBriefcase } from 'react-icons/fi';

import api from '../services/api';

const ScanPage = () => {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrData, setQRData] = useState(null);
  const [content, setContent] = useState(null);

  useEffect(() => {
    fetchContent();
  }, [code]);

  // After page loads, silently request browser GPS and report to backend
  // This patches the scan record for local/private-IP scans where geoip-lite returns nothing
  const reportGPSLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await api.post(`/scan/${code}/location`, { latitude, longitude });
        } catch { /* non-critical — ignore */ }
      },
      () => { /* user denied — that's fine */ },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const fetchContent = async () => {
    try {
      const response = await api.get(`/scan/${code}/content`);
      setQRData(response.data.qrCode);
      setContent(response.data.content);
      // After content loads successfully, report GPS in the background
      reportGPSLocation();
    } catch (error) {
      setError(error.response?.data?.message || 'QR code not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid #2563eb' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Render based on content type
  const renderContent = () => {
    switch (qrData?.type) {
      case 'vcard':
        return <VCardViewer data={content} code={code} />;
      case 'text':
        return <TextViewer data={content} code={code} />;
      case 'file':
      case 'document':
      case 'media':
        // Handle different file types
        if (content?.fileType === 'image') {
          return <ImageViewer data={content} code={code} />;
        } else if (content?.fileType === 'video') {
          return <VideoViewer data={content} code={code} />;
        } else if (content?.fileType === 'audio') {
          return <AudioViewer data={content} code={code} />;
        } else if (content?.fileType === 'document') {
          return <DocumentViewer data={content} code={code} />;
        }
        return <FileViewer data={content} code={code} />;
      case 'multilink':
        return <MultiLinkViewer data={content} code={code} />;
      case 'url':
        return <URLViewer data={content} code={code} />;
      case 'wifi':
        return <WiFiViewer data={content} code={code} />;
      case 'email':
        return <EmailViewer data={content} code={code} />;
      case 'sms':
        return <SMSViewer data={content} code={code} />;
      case 'location':
        return <LocationViewer data={content} code={code} />;
      default:
        return <DefaultViewer data={content} type={qrData?.type} code={code} />;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {renderContent()}
        
        {/* Powered By Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-slate-400">
            Powered by <span className="font-semibold" style={{ color: '#2563eb' }}>QR Generator</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// VCard Viewer Component
const VCardViewer = ({ data }) => {
  const downloadVCard = () => {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
    if (data.firstName || data.lastName) {
      vcard += `FN:${data.firstName || ''} ${data.lastName || ''}\n`;
    }
    if (data.email) vcard += `EMAIL;TYPE=INTERNET:${data.email}\n`;
    if (data.phone) vcard += `TEL;TYPE=WORK,VOICE:${data.phone}\n`;
    if (data.mobile) vcard += `TEL;TYPE=CELL,VOICE:${data.mobile}\n`;
    if (data.organization) vcard += `ORG:${data.organization}\n`;
    if (data.title) vcard += `TITLE:${data.title}\n`;
    if (data.website) vcard += `URL:${data.website}\n`;
    if (data.linkedin) vcard += `URL;TYPE=Linkedin:${data.linkedin}\n`;
    vcard += 'END:VCARD';


    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.firstName || 'contact'}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 text-center text-white" style={{ backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)' }}>
        <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-4">
          {data.photo ? (
            <img src={data.photo} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-4xl font-bold" style={{ color: '#2563eb' }}>
              {(data.firstName?.charAt(0) || '') + (data.lastName?.charAt(0) || '')}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{`${data.firstName || ''} ${data.lastName || ''}`}</h1>
        {data.title && <p className="text-white/80">{data.title}</p>}
        {data.organization && <p className="text-white/80">{data.organization}</p>}
      </div>

      {/* Contact Details */}
      <div className="p-6 space-y-4">
        {data.email && (
          <a href={`mailto:${data.email}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <FiMail className="text-xl" style={{ color: '#2563eb' }} />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">Email</span>
              <span className="text-slate-700">{data.email}</span>
            </div>
          </a>
        )}
        {data.phone && (
          <a href={`tel:${data.phone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <FiPhone className="text-xl text-blue-500" />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">Office Phone</span>
              <span className="text-slate-700">{data.phone}</span>
            </div>
          </a>
        )}
        {data.mobile && (
          <a href={`tel:${data.mobile}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <FiSmartphone className="text-xl text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">Mobile Number</span>
              <span className="text-slate-700">{data.mobile}</span>
            </div>
          </a>
        )}
        {data.website && (
          <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <FiGlobe className="text-xl text-sky-500" />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">Website</span>
              <span className="text-slate-700">{data.website}</span>
            </div>
          </a>
        )}
        {data.linkedin && (
          <a href={data.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <FiLinkedin className="text-xl text-blue-700" />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">LinkedIn</span>
              <span className="text-slate-700">{data.linkedin}</span>
            </div>
          </a>
        )}

        {data.address && (
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <FiMapPin className="text-xl flex-shrink-0 mt-0.5" style={{ color: '#2563eb' }} />
            <div className="flex flex-col">
              <span className="text-[0.65vw] text-slate-400 font-bold uppercase">Address</span>
              <span className="text-slate-700">
                {[data.address.street, data.address.city, data.address.state, data.address.zip, data.address.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          </div>
        )}


        {/* Save Contact Button */}
        <button
          onClick={downloadVCard}
          className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-lg transition-colors font-medium"
          style={{ backgroundColor: '#2563eb' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          <FiDownload />
          Save Contact
        </button>
      </div>
    </div>
  );
};

// Text Viewer Component
const TextViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6">
    <h2 className="text-lg font-semibold text-slate-800 mb-4">Message</h2>
    <div className="p-4 bg-slate-50 rounded-lg">
      <p className="text-slate-700 whitespace-pre-wrap">{data.content}</p>
    </div>
  </div>
);

// File Viewer Component
const FileViewer = ({ data, code }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#eff6ff' }}>
      <FiFile className="text-3xl" style={{ color: '#2563eb' }} />
    </div>
    <h2 className="text-xl font-semibold text-slate-800 mb-2">{data.fileName}</h2>
    <p className="text-slate-500 mb-6">{data.mimeType}</p>
    
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium hover:bg-slate-200"
      >
        <FiExternalLink />
        View Raw
      </a>
      <a
        href={`${import.meta.env.VITE_BACKEND_URL}/scan/${code}/download`}
        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium"
        style={{ backgroundColor: '#2563eb' }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
      >
        <FiDownload />
        Download
      </a>
    </div>
  </div>
);

// Multi-Link Viewer Component
const MultiLinkViewer = ({ data }) => (
  <div 
    className="rounded-2xl shadow-lg p-6"
    style={{ backgroundColor: data.backgroundColor || '#f8fafc' }}
  >
    {/* Profile */}
    <div className="text-center mb-6">
      {data.avatar && (
        <img src={data.avatar} alt="Profile" className="w-24 h-24 mx-auto rounded-full mb-4 object-cover" />
      )}
      <h1 className="text-2xl font-bold text-slate-800">{data.title}</h1>
      {data.description && <p className="text-slate-600 mt-2">{data.description}</p>}
    </div>

    {/* Links */}
    <div className="space-y-3">
      {data.links?.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-4 rounded-lg transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: link.backgroundColor || '#3b82f6',
            color: link.textColor || '#ffffff',
          }}
        >
          {link.icon && <img src={link.icon} alt="" className="w-5 h-5" />}
          <span className="font-medium">{link.title}</span>
          <FiExternalLink className="ml-auto" />
        </a>
      ))}
    </div>

    {/* Social Links */}
    {data.socialLinks?.length > 0 && (
      <div className="flex justify-center gap-4 mt-6">
        {data.socialLinks.map((social, index) => (
          <a
            key={index}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow hover:shadow-md transition-shadow"
          >
            <FiLink className="text-slate-600" />
          </a>
        ))}
      </div>
    )}
  </div>
);

// Default Viewer Component
const DefaultViewer = ({ data, type }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <h2 className="text-xl font-semibold text-slate-800 mb-4">{type} Content</h2>
    <pre className="p-4 bg-slate-50 rounded-lg text-left overflow-auto text-sm">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

const ImageViewer = ({ data, code }) => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eff6ff' }}>
          <FiFile className="text-xl" style={{ color: '#2563eb' }} />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 truncate">{data.fileName}</h2>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">{data.mimeType}</p>
        </div>
      </div>

      <img 
        src={data.url} 
        alt={data.fileName} 
        className="w-full rounded-xl mb-6 shadow-sm ring-1 ring-slate-200 object-contain max-h-[50vh]"
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
          <span className="text-slate-500 font-medium">File Size</span>
          <span className="text-slate-900 font-bold">{formatBytes(data.fileSize)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium hover:bg-slate-200 text-sm"
          >
            <FiExternalLink className="text-lg" />
            View
          </a>
          <a
            href={`${import.meta.env.VITE_BACKEND_URL}/scan/${code}/download`}
            className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors font-medium text-sm"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            <FiDownload className="text-lg" />
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
);

const VideoViewer = ({ data, code }) => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff1f2' }}>
          <FiFile className="text-xl text-rose-500" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 truncate">{data.fileName}</h2>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">{data.mimeType}</p>
        </div>
      </div>

      <video 
        src={data.url} 
        controls 
        className="w-full rounded-xl mb-6 shadow-sm ring-1 ring-slate-900/10 bg-black aspect-video"
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
          <span className="text-slate-500 font-medium">File Size</span>
          <span className="text-slate-900 font-bold">{formatBytes(data.fileSize)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium hover:bg-slate-200 text-sm"
          >
            <FiExternalLink className="text-lg" />
            View
          </a>
          <a
            href={`${import.meta.env.VITE_BACKEND_URL}/scan/${code}/download`}
            className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors font-medium text-sm"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            <FiDownload className="text-lg" />
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
);

const AudioViewer = ({ data, code }) => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
          <FiFile className="text-xl text-sky-500" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 truncate">{data.fileName}</h2>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">{data.mimeType}</p>
        </div>
      </div>

      <audio 
        src={data.url} 
        controls 
        className="w-full mb-6"
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
          <span className="text-slate-500 font-medium">File Size</span>
          <span className="text-slate-900 font-bold">{formatBytes(data.fileSize)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium hover:bg-slate-200 text-sm"
          >
            <FiExternalLink className="text-lg" />
            View
          </a>
          <a
            href={`${import.meta.env.VITE_BACKEND_URL}/scan/${code}/download`}
            className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors font-medium text-sm"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            <FiDownload className="text-lg" />
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
);

// Document Viewer Component
const DocumentViewer = ({ data, code }) => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#eff6ff' }}>
          <FiFile className="text-3xl" style={{ color: '#2563eb' }} />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">{data.fileName}</h2>
        <p className="text-slate-600 text-sm">{data.mimeType}</p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 mt-4">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium hover:bg-slate-200 text-sm"
          >
            <FiExternalLink className="text-lg" />
            View
          </a>
          <a
            href={`${import.meta.env.VITE_BACKEND_URL}/scan/${code}/download`}
            className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors font-medium text-sm"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            <FiDownload className="text-lg" />
            Download
          </a>
        </div>
      </div>
    </div>
  </div>
);

// URL Viewer Component
const URLViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    <div className="p-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#eff6ff' }}>
        <FiLink className="text-3xl" style={{ color: '#2563eb' }} />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Website Link</h2>
      <p className="text-slate-600 mb-6 break-all">{data.target}</p>
      {data.title && <p className="text-slate-700 font-semibold mb-2">{data.title}</p>}
      {data.description && <p className="text-slate-600 text-sm mb-6">{data.description}</p>}
      <a
        href={data.target}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium"
        style={{ backgroundColor: '#2563eb' }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
      >
        <FiExternalLink />
        Visit Website
      </a>
    </div>
  </div>
);

// WiFi Viewer Component
const WiFiViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f0fdf4' }}>
      <span className="text-3xl text-emerald-600">📶</span>
    </div>
    <h2 className="text-xl font-semibold text-slate-800 mb-2">WiFi Network</h2>
    <div className="space-y-3 mt-6 text-left p-4 bg-slate-50 rounded-xl">
      <p className="text-slate-600 text-sm"><span className="font-semibold">SSID:</span> {data.ssid}</p>
      <p className="text-slate-600 text-sm"><span className="font-semibold">Security:</span> {data.encryption || 'WPA/WPA2'}</p>
      {data.hidden && <p className="text-slate-600 text-sm font-semibold text-rose-500">Hidden Network</p>}
    </div>
    <p className="text-slate-500 text-xs mt-6">
      To connect: Go to your device settings, find the WiFi network named <span className="font-bold">"{data.ssid}"</span> and enter the password.
    </p>
  </div>
);

// Email Viewer Component
const EmailViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fef2f2' }}>
      <FiMail className="text-3xl text-rose-500" />
    </div>
    <h2 className="text-xl font-semibold text-slate-800 mb-2">Send Email</h2>
    <div className="space-y-3 mt-6 text-left p-4 bg-slate-50 rounded-xl">
      <p className="text-slate-600 text-sm"><span className="font-semibold">To:</span> {data.address || data.email}</p>
      {data.subject && <p className="text-slate-600 text-sm"><span className="font-semibold">Subject:</span> {data.subject}</p>}
      {data.body && <p className="text-slate-600 text-sm line-clamp-3"><span className="font-semibold">Message:</span> {data.body}</p>}
    </div>
    <a
      href={`mailto:${data.address || data.email}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium mt-6 w-full"
      style={{ backgroundColor: '#2563eb' }}
    >
      <FiMail />
      Compose Email
    </a>
  </div>
);

// SMS Viewer Component
const SMSViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#ecfdf5' }}>
      <span className="text-3xl text-emerald-500">💬</span>
    </div>
    <h2 className="text-xl font-semibold text-slate-800 mb-2">Send Message</h2>
    <div className="space-y-3 mt-6 text-left p-4 bg-slate-50 rounded-xl">
      <p className="text-slate-600 text-sm"><span className="font-semibold">Phone:</span> {data.phone}</p>
      {data.message && <p className="text-slate-600 text-sm"><span className="font-semibold">Message:</span> {data.message}</p>}
    </div>
    <a
      href={`sms:${data.phone}${data.message ? '?body=' + encodeURIComponent(data.message) : ''}`}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium mt-6 w-full"
      style={{ backgroundColor: '#10b981' }}
    >
      <span className="text-xl">💬</span>
      Send SMS
    </a>
  </div>
);

// Location Viewer Component
const LocationViewer = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fff7ed' }}>
      <FiMapPin className="text-3xl text-orange-500" />
    </div>
    <h2 className="text-xl font-semibold text-slate-800 mb-2">{data.name || 'Location'}</h2>
    <div className="space-y-3 mt-6 text-left p-4 bg-slate-50 rounded-xl">
      {data.address && <p className="text-slate-600 text-sm"><span className="font-semibold">Address:</span> {data.address}</p>}
      {data.latitude && <p className="text-slate-600 text-xs text-slate-400">Coordinates: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}</p>}
    </div>
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${data.latitude ? `${data.latitude},${data.longitude}` : encodeURIComponent(data.address || '')}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium mt-6 w-full"
      style={{ backgroundColor: '#f97316' }}
    >
      <FiExternalLink />
      Open in Maps
    </a>
  </div>
);

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ScanPage;