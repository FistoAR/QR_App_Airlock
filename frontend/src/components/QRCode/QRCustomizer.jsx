import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiCheck, FiImage, FiTarget, FiMinus, FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { contentAPI } from '../../services/api';
import { toast } from '../../components/UI/Toast';


const predefinedLogos = [
  { id: 'facebook', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg', label: 'Facebook' },
  { id: 'twitter', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/twitter/twitter-original.svg', label: 'Twitter' },
  { id: 'instagram', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg', label: 'Instagram' },
  { id: 'linkedin', url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg', label: 'LinkedIn' },
  { id: 'whatsapp', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', label: 'WhatsApp' },
  { id: 'youtube', url: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', label: 'YouTube' },
];

const dotStyles = [
  { id: 'square', label: 'Square', preview: '■' },
  { id: 'dots', label: 'Dots', preview: '●' },
  { id: 'rounded', label: 'Rounded', preview: '▢' },
  { id: 'classy', label: 'Classy', preview: '◆' },
  { id: 'extra-rounded', label: 'Extra Rounded', preview: '○' },
];

const cornerStyles = [
  { id: 'square', label: 'Square' },
  { id: 'dot', label: 'Dot' },
  { id: 'extra-rounded', label: 'Extra Rounded' },
];




const logoScales = [
  { id: 0.15, label: 'S' },
  { id: 0.2, label: 'M' },
  { id: 0.25, label: 'L' },
  { id: 0.35, label: 'XL' },
  { id: 0.45, label: '2XL' },
];

const errorLevels = [
  { id: 'L', label: 'Low (7%)', description: 'Smallest QR code' },
  { id: 'M', label: 'Medium (15%)', description: 'Balanced' },
  { id: 'Q', label: 'Quartile (25%)', description: 'Better recovery' },
  { id: 'H', label: 'High (30%)', description: 'Best for logos' },
];

const frameStyles = [
  { id: 'none', label: 'No Frame' },
  { id: 'simple', label: 'Simple' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'banner', label: 'Banner' },
];

// Color Picker Component moved outside to prevent re-creation and fix "not smooth" dragging
const ColorPickerPopover = ({ 
  colorKey, label, nested = false, parentKey = '', 
  customization, activeColorPicker, setActiveColorPicker, 
  updateCustomization, updateNestedCustomization, pickerRef 
}) => {
  const currentColor = nested 
    ? customization[parentKey]?.[colorKey] 
    : customization[colorKey];
  const isActive = activeColorPicker === `${parentKey}-${colorKey}`;

  return (
    <div className="relative">
      <label className="block text-[0.75vw] font-medium text-slate-600 mb-[0.3vw]">
        {label}
      </label>
      <div className="flex items-center gap-[0.5vw]">
        <button
          type="button"
          data-picker-toggle={colorKey}
          onClick={() => setActiveColorPicker(isActive ? null : `${parentKey}-${colorKey}`)}
          className="w-[2.5vw] h-[2.5vw] rounded-[0.3vw] border-2 border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
          style={{ backgroundColor: currentColor }}
        />
        <input
          type="text"
          value={currentColor}
          onChange={(e) => {
            if (nested) {
              updateNestedCustomization(parentKey, colorKey, e.target.value);
            } else {
              updateCustomization(colorKey, e.target.value);
            }
          }}
          className="flex-1 px-[0.5vw] py-[0.4vw] text-[0.8vw] border border-slate-200 rounded-[0.3vw] uppercase"
        />
      </div>
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-[0.5vw] p-[0.75vw] bg-white rounded-[0.5vw] shadow-xl border border-slate-200"
          >
            <HexColorPicker
              color={currentColor}
              onChange={(color) => {
                if (nested) {
                  updateNestedCustomization(parentKey, colorKey, color);
                } else {
                  updateCustomization(colorKey, color);
                }
              }}
              style={{ width: '12vw', height: '10vw' }}
            />
            <div className="mt-[0.5vw] flex items-center justify-between">
              <HexColorInput
                color={currentColor}
                onChange={(color) => {
                  if (nested) {
                    updateNestedCustomization(parentKey, colorKey, color);
                  } else {
                    updateCustomization(colorKey, color);
                  }
                }}
                className="w-full px-[0.5vw] py-[0.3vw] text-[0.75vw] border border-slate-200 rounded-[0.3vw] uppercase"
                prefixed
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveColorPicker(null)}
              className="w-full mt-[0.5vw] px-[0.5vw] py-[0.3vw] text-white text-[0.75vw] rounded-[0.3vw] transition-colors"
              style={{ backgroundColor: '#2563eb' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QRCustomizer = () => {
  const { watch, setValue } = useFormContext();
  const customization = watch('customization');
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  const [uploadedLogos, setUploadedLogos] = useState(() => {
    try {
      const saved = localStorage.getItem('qr_app_uploaded_logos');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const pickerRef = useRef(null);

  // Close color picker on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        // Prevent immediate re-opening if clicking a toggle button
        if (!event.target.closest('button[data-picker-toggle]')) {
          setActiveColorPicker(null);
        }
      }
    };
    if (activeColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeColorPicker]);

  const updateCustomization = (key, value) => {
    setValue(`customization.${key}`, value, { shouldDirty: true });
  };

  const updateNestedCustomization = (parent, key, value) => {
    setValue(`customization.${parent}.${key}`, value, { shouldDirty: true });
  };

  const saveLogoToGallery = (newLogo) => {
    setUploadedLogos(prev => {
      const updated = [newLogo, ...prev];
      localStorage.setItem('qr_app_uploaded_logos', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteUploadedLogo = (id, logoUrl) => {
    setUploadedLogos(prev => {
      const updated = prev.filter(l => l.id !== id);
      localStorage.setItem('qr_app_uploaded_logos', JSON.stringify(updated));
      return updated;
    });
    if (customization.logo?.url === logoUrl) {
      updateNestedCustomization('logo', 'url', '');
    }
  };

  // Logo upload handler
  const onLogoDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      const toastId = toast.loading('Uploading custom logo...');
      try {
        const response = await contentAPI.upload(formData);
        if (response.data?.success) {
          let fileUrl = response.data.data.url;
          // Only prepend backend URL if it's a relative path
          const absoluteUrl = fileUrl.startsWith('http') 
            ? fileUrl 
            : `${import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '')}${fileUrl}`;
          
          const newLogo = {
            id: `ul-${Date.now()}`,
            url: absoluteUrl,
            label: 'Custom'
          };
          saveLogoToGallery(newLogo);
          // Automatically select the newly uploaded logo
          updateNestedCustomization('logo', 'url', absoluteUrl);
          toast.success('Logo uploaded to gallery and selected!', { id: toastId });
        } else {
          toast.error('Failed to upload logo', { id: toastId });
        }
      } catch (error) {
        console.error('Upload Error', error);
        toast.error('Upload failed. Using local preview temporarily.', { id: toastId });
        
        // Fallback to local DataURL if server fails
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          saveLogoToGallery({ id: `ul-${Date.now()}`, url: dataUrl, label: 'Custom (Local)' });
          updateNestedCustomization('logo', 'url', dataUrl);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({
    onDrop: onLogoDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024, // 2MB
  });

  const removeLogo = () => {
    updateNestedCustomization('logo', 'url', '');
  };

  return (
    <div className="space-y-[1.25vw]">
      {/* Colors Section (with Quick Presets) */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Colors</h4>
        <div className="grid grid-cols-2 gap-[1vw] mb-[0.75vw]">
          <ColorPickerPopover
            colorKey="foregroundColor"
            label="QR Code Color"
            customization={customization}
            activeColorPicker={activeColorPicker}
            setActiveColorPicker={setActiveColorPicker}
            updateCustomization={updateCustomization}
            updateNestedCustomization={updateNestedCustomization}
            pickerRef={pickerRef}
          />
          <ColorPickerPopover
            colorKey="backgroundColor"
            label="Background Color"
            customization={customization}
            activeColorPicker={activeColorPicker}
            setActiveColorPicker={setActiveColorPicker}
            updateCustomization={updateCustomization}
            updateNestedCustomization={updateNestedCustomization}
            pickerRef={pickerRef}
          />
        </div>
        <div>
          <p className="text-[0.7vw] font-medium text-slate-500 mb-[0.4vw]">Quick Presets</p>
          <div className="flex flex-wrap gap-[0.4vw]">
            {[
              { name: 'Classic', fg: '#000000', bg: '#FFFFFF', dot: 'square' },
              { name: 'Blue',    fg: '#2563eb', bg: '#FFFFFF', dot: 'rounded' },
              { name: 'Dark',    fg: '#FFFFFF', bg: '#1e293b', dot: 'dots' },
              { name: 'Green',   fg: '#16a34a', bg: '#f0fdf4', dot: 'rounded' },
              { name: 'Purple',  fg: '#7c3aed', bg: '#FFFFFF', dot: 'classy' },
              { name: 'Coral',   fg: '#f97316', bg: '#fff7ed', dot: 'extra-rounded' },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  updateCustomization('foregroundColor', preset.fg);
                  updateCustomization('backgroundColor', preset.bg);
                  updateCustomization('dotStyle', preset.dot);
                }}
                className="px-[0.65vw] py-[0.3vw] text-[0.7vw] border border-slate-200 rounded-[0.3vw] hover:bg-white hover:shadow-sm transition-all flex items-center gap-[0.3vw] bg-white/60"
              >
                <span
                  className="w-[0.75vw] h-[0.75vw] rounded-full border"
                  style={{ backgroundColor: preset.fg }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dot Style Section */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Dot Style</h4>
        <div className="grid grid-cols-5 gap-[0.5vw]">
          {dotStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => updateCustomization('dotStyle', style.id)}
              className={`
                p-[0.6vw] rounded-[0.4vw] border-2 text-center transition-all
                ${
                  customization.dotStyle === style.id
                    ? 'border-slate-400 text-slate-700'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
              style={{
                backgroundColor: customization.dotStyle === style.id ? '#eff6ff' : 'transparent',
                borderColor: customization.dotStyle === style.id ? '#3b82f6' : undefined,
              }}
            >
              <span className="text-[1.5vw] block mb-[0.2vw]">{style.preview}</span>
              <span className="text-[0.65vw] text-slate-600">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Corner Style Section */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Eye Frame Style</h4>
        <div className="grid grid-cols-3 gap-[0.5vw]">
          {cornerStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => updateCustomization('cornerStyle', style.id)}
              className={`
                p-[0.6vw] rounded-[0.4vw] border-2 text-center transition-all text-[0.8vw]
                ${
                  customization.cornerStyle === style.id
                    ? 'text-slate-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }
              `}
              style={{
                backgroundColor: customization.cornerStyle === style.id ? '#eff6ff' : 'transparent',
                borderColor: customization.cornerStyle === style.id ? '#3b82f6' : undefined,
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Corner Dot Style Section */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Eye Ball Style</h4>
        <div className="grid grid-cols-3 gap-[0.5vw]">
          {cornerStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => updateCustomization('cornerDotStyle', style.id)}
              className={`
                p-[0.6vw] rounded-[0.4vw] border-2 text-center transition-all text-[0.8vw]
                ${
                  (customization.cornerDotStyle || 'square') === style.id
                    ? 'text-slate-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }
              `}
              style={{
                backgroundColor: (customization.cornerDotStyle || 'square') === style.id ? '#eff6ff' : 'transparent',
                borderColor: (customization.cornerDotStyle || 'square') === style.id ? '#3b82f6' : undefined,
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>



      {/* Error Correction Level */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Error Correction</h4>
        <div className="grid grid-cols-2 gap-[0.5vw]">
          {errorLevels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => updateCustomization('errorCorrectionLevel', level.id)}
              className="p-[0.6vw] rounded-[0.4vw] border-2 text-left transition-all"
              style={{
                backgroundColor: customization.errorCorrectionLevel === level.id ? '#eff6ff' : 'transparent',
                borderColor: customization.errorCorrectionLevel === level.id ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <span className="text-[0.8vw] font-medium block">{level.label}</span>
              <span className="text-[0.65vw] text-slate-500">{level.description}</span>
            </button>
          ))}
        </div>
        <p className="text-[0.7vw] text-slate-500 mt-[0.5vw]">
          Higher error correction allows for logo placement but increases QR complexity
        </p>
      </div>

      {/* Logo Upload Section */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Center Logo</h4>
        
        {customization.logo?.url && (
          <div className="space-y-[1vw] mb-[1.25vw]">
            <div className="flex items-start gap-[1vw] p-[1vw] bg-white border border-slate-200 rounded-[0.5vw]">
              <div className="relative">
                <div className="w-[5vw] h-[5vw] rounded-[0.4vw] border border-slate-200 bg-white flex items-center justify-center placeholder-transparent p-[0.3vw]">
                  <img
                    src={
                      customization.logo.url?.startsWith('data:') || customization.logo.url?.startsWith('http')
                        ? customization.logo.url
                        : `${(import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '')).replace(/\/$/, '')}/${customization.logo.url.replace(/^\//, '')}`
                    }
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-[0.4vw] -right-[0.4vw] w-[1.25vw] h-[1.25vw] bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                >
                  <FiX className="text-[0.7vw]" />
                </button>
              </div>
              
              <div className="flex-1 space-y-[0.8vw]">
                <div>
                  <label className="block text-[0.75vw] font-medium text-slate-600 mb-[0.3vw]">
                    Logo Scale
                  </label>
                  <div className="flex items-center gap-[0.4vw]">
                    {logoScales.map((scale) => (
                      <button
                        key={scale.label}
                        type="button"
                        onClick={() => updateNestedCustomization('logo', 'size', scale.id)}
                        className={`
                          flex-1 py-[0.3vw] text-[0.7vw] font-bold border rounded-[0.3vw] transition-all
                          ${customization.logo?.size === scale.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm transition-all' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}
                        `}
                      >
                        {scale.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo BG & Border */}
                <div className="grid grid-cols-2 gap-[0.75vw]">
                  <ColorPickerPopover
                    colorKey="backgroundColor"
                    label="Logo Bg"
                    nested={true}
                    parentKey="logo"
                    customization={customization}
                    activeColorPicker={activeColorPicker}
                    setActiveColorPicker={setActiveColorPicker}
                    updateCustomization={updateCustomization}
                    updateNestedCustomization={updateNestedCustomization}
                    pickerRef={pickerRef}
                  />
                  <ColorPickerPopover
                    colorKey="borderColor"
                    label="Logo Border"
                    nested={true}
                    parentKey="logo"
                    customization={customization}
                    activeColorPicker={activeColorPicker}
                    setActiveColorPicker={setActiveColorPicker}
                    updateCustomization={updateCustomization}
                    updateNestedCustomization={updateNestedCustomization}
                    pickerRef={pickerRef}
                  />
                </div>
              </div>
            </div>
            <p className="text-[0.65vw] text-amber-600 font-medium ml-[0.2vw]">
              Tip: Ensure your Error Correction is set to High (H) or Quartile (Q) for best logo visibility!
            </p>
          </div>
        )}

        <div className="space-y-[1vw]">
          <p className="text-[0.75vw] font-medium text-slate-600 mb-[0.5vw]">Quick Pick & Upload:</p>
          <div className="flex flex-wrap gap-[0.5vw] items-center">
            
            {/* Upload Button Hooked to Dropzone */}
            <div
              {...getLogoRootProps()}
              className={`
                w-[2.5vw] h-[2.5vw] border-2 border-dashed rounded-[0.4vw] flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isLogoDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}
              `}
              title="Upload Custom Logo"
            >
              <input {...getLogoInputProps()} />
              <FiUpload className="text-[1vw] text-slate-400" />
            </div>

            {/* Custom Uploaded Logos */}
            {uploadedLogos.map((ulogo) => (
              <div key={ulogo.id} className="relative group w-[2.5vw] h-[2.5vw]">
                <button
                  type="button"
                  onClick={() => updateNestedCustomization('logo', 'url', ulogo.url)}
                  className={`
                    w-full h-full p-[0.3vw] bg-white border rounded-[0.4vw] transition-all flex items-center justify-center
                    ${customization.logo?.url === ulogo.url ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400'}
                  `}
                  title={ulogo.label}
                >
                  <img src={ulogo.url} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteUploadedLogo(ulogo.id, ulogo.url); }}
                  className="absolute -top-[0.2vw] -right-[0.2vw] w-[1vw] h-[1vw] bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
                  title="Remove logo"
                >
                  <FiX className="text-[0.6vw]" />
                </button>
              </div>
            ))}

            {/* Predefined Gallery Logos */}
            {predefinedLogos.map((plogo) => (
              <button
                key={plogo.id}
                type="button"
                onClick={() => updateNestedCustomization('logo', 'url', plogo.url)}
                className={`
                  w-[2.5vw] h-[2.5vw] p-[0.4vw] bg-white border rounded-[0.4vw] transition-all flex items-center justify-center
                  ${customization.logo?.url === plogo.url ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400'}
                `}
                title={plogo.label}
              >
                <img src={plogo.url} alt={plogo.label} className="max-w-full max-h-full object-contain" />
              </button>
            ))}

          </div>
          <p className="text-[0.65vw] text-slate-400 mt-[0.25vw] ml-[0.2vw]">
            PNG, JPG, SVG, GIF up to 2MB allowed. Click + to add custom logos.
          </p>
        </div>
      </div>

      {/* Frame Section */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Frame</h4>
        
        <div className="grid grid-cols-4 gap-[0.5vw] mb-[0.75vw]">
          {frameStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => updateNestedCustomization('frame', 'style', style.id)}
              className="p-[0.6vw] rounded-[0.4vw] border-2 text-center transition-all text-[0.75vw]"
              style={{
                borderColor: customization.frame?.style === style.id ? '#3b82f6' : '#e5e7eb',
                backgroundColor: customization.frame?.style === style.id ? '#eff6ff' : 'transparent',
                color: customization.frame?.style === style.id ? '#1d4ed8' : '#64748b',
              }}
            >
              {style.label}
            </button>
          ))}
        </div>

        {customization.frame?.style && customization.frame.style !== 'none' && (
          <div className="space-y-[0.75vw] pt-[0.75vw] border-t border-slate-200">
            <div>
              <label className="block text-[0.75vw] font-medium text-slate-600 mb-[0.3vw]">
                Frame Text
              </label>
              <input
                type="text"
                value={customization.frame?.text || ''}
                onChange={(e) => updateNestedCustomization('frame', 'text', e.target.value)}
                placeholder="Scan Me!"
                className="w-full px-[0.6vw] py-[0.5vw] text-[0.8vw] border border-slate-200 rounded-[0.3vw] focus:outline-none"
                style={{ '--tw-ring-color': '#2563eb' }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-[0.75vw]">
              <ColorPickerPopover
                colorKey="textColor"
                label="Text Color"
                nested={true}
                parentKey="frame"
                customization={customization}
                activeColorPicker={activeColorPicker}
                setActiveColorPicker={setActiveColorPicker}
                updateCustomization={updateCustomization}
                updateNestedCustomization={updateNestedCustomization}
                pickerRef={pickerRef}
              />
              <ColorPickerPopover
                colorKey="backgroundColor"
                label="Frame Background"
                nested={true}
                parentKey="frame"
                customization={customization}
                activeColorPicker={activeColorPicker}
                setActiveColorPicker={setActiveColorPicker}
                updateCustomization={updateCustomization}
                updateNestedCustomization={updateNestedCustomization}
                pickerRef={pickerRef}
              />
            </div>
          </div>
        )}
      </div>

      {/* Margin Control */}
      <div className="p-[1vw] bg-slate-50 rounded-[0.5vw]">
        <h4 className="text-[0.9vw] font-semibold text-slate-800 mb-[0.75vw]">Quiet Zone (Margin)</h4>
        <div className="flex items-center gap-[1.5vw]">
          <div className="flex items-center bg-white border border-slate-200 rounded-[0.5vw] overflow-hidden">
            <button
              type="button"
              onClick={() => updateCustomization('margin', Math.max(0, (customization.margin || 0) - 1))}
              className="p-[0.6vw] hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FiMinus className="text-[0.8vw]" />
            </button>
            <div className="w-[3vw] h-full flex items-center justify-center border-x border-slate-100 font-bold text-[0.9vw] text-slate-700">
              {customization.margin || 0}
            </div>
            <button
              type="button"
              onClick={() => updateCustomization('margin', Math.min(20, (customization.margin || 0) + 1))}
              className="p-[0.6vw] hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FiPlus className="text-[0.8vw]" />
            </button>
          </div>
          <div className="flex-1">
             <p className="text-[0.65vw] text-slate-500 italic">
               The "quiet zone" is the area around the QR code that ensures scanners can read it. 4 is standard.
             </p>
          </div>
        </div>
      </div>


    </div>
  );
};

export default QRCustomizer;