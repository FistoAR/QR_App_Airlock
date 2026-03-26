import React, { useEffect, useRef, useMemo } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { FiArrowRight } from 'react-icons/fi';

const QRPreview = ({ customization = {}, content = {}, type = 'url', disabled = false }) => {
  const {
    foregroundColor = '#000000',
    backgroundColor = '#FFFFFF',
    errorCorrectionLevel = 'M',
    logo = {},
    margin = 4,
    dotStyle = 'square',
    cornerStyle = 'square',
    cornerDotStyle = 'square',
    frame = {},
  } = customization;

  const previewSize = customization.previewSize || '18vw';

  const qrRef = useRef(null);
  const qrCode = useRef(null);

  // Map dot styles for QR body modules
  const getDotType = (style) => {
    switch (style) {
      case 'dots': return 'dots';
      case 'rounded': return 'rounded';
      case 'classy': return 'classy';
      case 'extra-rounded': return 'extra-rounded';
      default: return 'square';
    }
  };

  // Map eye FRAME (outer square) styles
  const getCornerSquareType = (style) => {
    switch (style) {
      case 'dot': return 'dot';
      case 'extra-rounded': return 'extra-rounded';
      default: return 'square';
    }
  };

  // Map eye BALL (inner dot) styles
  const getCornerDotType = (style) => {
    switch (style) {
      case 'dot': return 'dot';
      case 'extra-rounded': return 'extra-rounded';
      default: return 'square';
    }
  };



  // Generate preview content string
  const previewData = useMemo(() => {
    const generateVCardStr = (data) => {
      let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
      if (data.firstName || data.lastName) {
        vcard += `N:${data.lastName || ''};${data.firstName || ''}\n`;
        vcard += `FN:${data.firstName || ''} ${data.lastName || ''}\n`;
      }
      if (data.organization) vcard += `ORG:${data.organization}\n`;
      if (data.title) vcard += `TITLE:${data.title}\n`;
      if (data.email) vcard += `EMAIL;TYPE=INTERNET:${data.email}\n`;
      if (data.phone) vcard += `TEL;TYPE=VOICE:${data.phone}\n`;
      if (data.mobile) vcard += `TEL;TYPE=CELL,VOICE:${data.mobile}\n`;
      if (data.website) vcard += `URL:${data.website}\n`;
      if (data.linkedin) {
        vcard += `X-SOCIALPROFILE;TYPE=linkedin:${data.linkedin}\n`;
        vcard += `X-LINKEDIN:${data.linkedin}\n`;
        vcard += `URL;TYPE=WORK:${data.linkedin}\n`;
        if (!data.website) {
          vcard += `URL:${data.linkedin}\n`;
        }
      }
      vcard += 'END:VCARD';
      return vcard;
    };

    const generate = (type, data) => {
      if (!data) return 'https://example.com';
      switch (type) {
        case 'url': return data.target || data.url || 'https://example.com';
        case 'text': return data.content || data.text || 'Sample Text';
        case 'email': return `mailto:${data.address || data.email || data.to || ''}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`;
        case 'sms': return `sms:${data.phone || ''}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;
        case 'wifi': return `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};H:${data.hidden ? 'true' : 'false'};;`;
        case 'location': {
          const query = [data.address, data.postalCode].filter(Boolean).join(' ');
          return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : 'https://maps.google.com/';
        }
        case 'vcard': return generateVCardStr(data);
        default: return 'https://example.com';
      }
    };
    return generate(type, content);
  }, [type, content]);

  // 1. Stable Options to prevent heavy re-renders/blinking
  const options = useMemo(() => ({
    width: 1000,
    height: 1000,
    type: 'svg',
    data: previewData,
    image: logo?.url ? (
      logo.url.startsWith('data:') 
        ? logo.url 
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4001/api'}/content/proxy?url=${encodeURIComponent(
            logo.url.startsWith('http') 
              ? logo.url 
              : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001'}${logo.url}`
          )}`
    ) : '',
    dotsOptions: {
      color: foregroundColor,
      type: getDotType(dotStyle)
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    cornersSquareOptions: {
      type: getCornerSquareType(cornerStyle),
      color: foregroundColor
    },
    cornersDotOptions: {
      type: getCornerDotType(cornerDotStyle),
      color: foregroundColor
    },

    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10,
      imageSize: logo?.size || 0.25
    },
    qrOptions: {
      errorCorrectionLevel: errorCorrectionLevel,
      typeNumber: 0
    },
    margin: margin * 5,
  }), [previewData, foregroundColor, backgroundColor, dotStyle, cornerStyle, cornerDotStyle, logo?.url, logo?.size, errorCorrectionLevel, margin]);

  useEffect(() => {
    if (!qrRef.current) return;

    try {
      if (!qrCode.current) {
        qrCode.current = new QRCodeStyling(options);
        qrCode.current.append(qrRef.current);
      } else {
        qrCode.current.update(options);
      }
    } catch (err) {
      console.error('QR code styling error:', err);
    }
  }, [options]); // Initial render and update when options change

  // 2. Stable Dynamic Styles (Logo Background/Border)
  useEffect(() => {
    if (disabled || !qrRef.current) return;

    const updateLogoStyles = () => {
      const svg = qrRef.current?.querySelector('svg');
      const img = svg?.querySelector('image');
      
      if (img && logo?.url) {
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        if (logo?.backgroundColor || logo?.borderColor) {
          let bbox = { x: 0, y: 0, width: 0, height: 0 };
          try { bbox = img.getBBox(); } catch (e) {
            bbox = {
              x: parseFloat(img.getAttribute('x')) || 0,
              y: parseFloat(img.getAttribute('y')) || 0,
              width: parseFloat(img.getAttribute('width')) || 0,
              height: parseFloat(img.getAttribute('height')) || 0
            };
          }
          
          const { x, y, width: w, height: h } = bbox;
          
          if (w > 0 && h > 0) {
            let bgRect = svg.querySelector('#logo-preview-bg');
            if (!bgRect) {
              bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              bgRect.setAttribute('id', 'logo-preview-bg');
              img.parentNode.insertBefore(bgRect, img);
            }
            
            // Backend uses 0.15 margin, syncing here
            const margin = w * 0.18; // Increased slightly for better "padding" look
            bgRect.setAttribute('x', (x - margin/2).toString());
            bgRect.setAttribute('y', (y - margin/2).toString());
            bgRect.setAttribute('width', (w + margin).toString());
            bgRect.setAttribute('height', (h + margin).toString());
            bgRect.setAttribute('fill', logo.backgroundColor || '#FFFFFF');
            bgRect.setAttribute('stroke', logo.borderColor || '#E2E8F0');
            bgRect.setAttribute('stroke-width', Math.max(2, w * 0.03).toString());
            bgRect.setAttribute('rx', ((w + margin) * 0.15).toString());
          }
        } else {
          svg.querySelector('#logo-preview-bg')?.remove();
        }
      } else {
        svg?.querySelector('#logo-preview-bg')?.remove();
      }
    };

    // Ensure styles are applied even after lazy image render
    const timer = setTimeout(updateLogoStyles, 100);
    const timer2 = setTimeout(updateLogoStyles, 500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [disabled, logo?.backgroundColor, logo?.borderColor, logo?.url, logo?.size, options]); // options dependency ensures re-run if QR code structure changes

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative rounded-[1vw] qr-preview-container flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: frame.style && frame.style !== 'none' ? (frame.backgroundColor || '#FFFFFF') : '#FFFFFF',
          width: previewSize,
          height: previewSize,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          // Frame border styles
          ...(frame.style === 'simple' && {
            border: `4px solid ${frame.textColor || '#000000'}`,
            borderRadius: '4px',
          }),
          ...(frame.style === 'rounded' && {
            border: `4px solid ${frame.textColor || '#000000'}`,
            borderRadius: '16px',
          }),
          ...(frame.style === 'banner' && {
            borderTop: `12px solid ${frame.textColor || '#000000'}`,
            borderBottom: `12px solid ${frame.textColor || '#000000'}`,
            borderRadius: '4px',
          }),
          ...(frame.style && frame.style !== 'none' && { boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }),
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full relative">
          {/* Frame Top Text (Banner style) */}
          {frame.style === 'banner' && frame.text && (
            <div
              className="absolute top-[0.5vw] left-0 right-0 text-center text-[0.75vw] font-black uppercase tracking-widest z-10"
              style={{ color: frame.textColor }}
            >
              {frame.text}
            </div>
          )}

          {/* QR Code Container */}
          <div
            ref={qrRef}
            className={`qr-code-wrapper transition-all duration-500 ${disabled ? 'opacity-20 grayscale blur-[2px]' : 'opacity-100'}`}
            style={{
              width: frame.style && frame.style !== 'none' ? '82%' : '100%',
              height: frame.style && frame.style !== 'none' ? '82%' : '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible'
            }}
          />

          {/* Frame Bottom Text */}
          {frame.style && frame.style !== 'none' && frame.text && (
            <div
              className={`text-center font-black uppercase tracking-widest w-full z-10 
                ${frame.style === 'banner' ? 'absolute bottom-[0.5vw]' : 'mt-[0.4vw]'}
              `}
              style={{
                color: frame.textColor || '#000000',
                fontSize: frame.style === 'banner' ? '0.75vw' : '1vw',
                fontWeight: '900',
              }}
            >
              {frame.text}
            </div>
          )}
          
          {/* Overlay for selection */}
          {disabled && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex items-center justify-center p-[2vw] text-center transition-all duration-300">
                <div className="space-y-[0.75vw] scale-90">
                    <div className="w-[4.5vw] h-[4.5vw] bg-slate-100 rounded-full mx-auto flex items-center justify-center border border-slate-200">
                        <FiArrowRight className="text-slate-700 text-[1.8vw] animate-pulse" />
                    </div>
                    <p className="text-[1.1vw] font-black text-slate-800 uppercase tracking-[0.2em]">Awaiting Selection</p>
                    <p className="text-[0.8vw] text-slate-500 max-w-[15vw] mx-auto font-medium line-clamp-2">Select a QR type to begin</p>
                </div>
            </div>
          )}
        </div>
      </div>


      <style dangerouslySetInnerHTML={{
        __html: `
        .qr-code-wrapper svg {
          width: 100% !important;
          height: 100% !important;
          display: block;
        }
      `}} />
    </div>
  );
};

export default QRPreview;