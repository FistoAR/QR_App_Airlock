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
  const options = useMemo(() => {
    // Determine the API base for the proxy
    let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
    
    // Construct the absolute logo URL for the proxy
    let sourceLogoUrl = '';
    if (logo?.url) {
      const secureUrl = logo.url.startsWith('http://') 
        ? logo.url.replace('http://', 'https://') 
        : logo.url;

      if (secureUrl.startsWith('data:') || secureUrl.startsWith('http')) {
        sourceLogoUrl = secureUrl;
      } else {
        const backendBase = (import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '')).replace(/\/$/, '');
        const cleanPath = logo.url.startsWith('/') ? logo.url.slice(1) : logo.url;
        sourceLogoUrl = `${backendBase}/${cleanPath}`;
      }
    }

    const finalImageUrl = sourceLogoUrl ? (
      sourceLogoUrl.startsWith('data:') 
        ? sourceLogoUrl 
        : `${apiBase.replace(/\/$/, '')}/content/proxy?url=${encodeURIComponent(sourceLogoUrl)}`
    ) : '';

    return {
      width: 1000,
      height: 1000,
      type: 'svg',
      data: previewData,
      image: finalImageUrl,
      dotsOptions: { color: foregroundColor, type: getDotType(dotStyle) },
      backgroundOptions: { 
        // When frame has background, make QR transparent (no background fill)
        // When no frame background, use QR's backgroundColor
        color: (frame.style && frame.style !== 'none' && frame.backgroundColor) 
          ? '#00000000' // Transparent - will be removed from SVG
          : backgroundColor 
      },
      cornersSquareOptions: { type: getCornerSquareType(cornerStyle), color: foregroundColor },
      cornersDotOptions: { type: getCornerDotType(cornerDotStyle), color: foregroundColor },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10,
        imageSize: logo?.size || 0.25
      },
      qrOptions: { errorCorrectionLevel: errorCorrectionLevel, typeNumber: 0 },
      margin: 0,
    };
  }, [previewData, foregroundColor, backgroundColor, dotStyle, cornerStyle, cornerDotStyle, logo?.url, logo?.size, errorCorrectionLevel, frame.style, frame.backgroundColor]);

  useEffect(() => {
    if (!qrRef.current) return;

    try {
      // If logo changed or first time, clear it to prevent blank state
      if (qrRef.current) qrRef.current.innerHTML = '';
      
      qrCode.current = new QRCodeStyling(options);
      qrCode.current.append(qrRef.current);
    } catch (err) {
      console.error('QR code styling error:', err);
    }
  }, [options]); // Re-create on any options change ensuring fresh render

  // 3. Remove QR background rect when frame has background
  useEffect(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Find the background rect (usually the first rect in the SVG)
    const rects = svg.querySelectorAll('rect');
    let bgRect = null;

    // The background rect is typically the first element with the backgroundColor
    if (rects.length > 0) {
      rects.forEach(rect => {
        const fill = rect.getAttribute('fill');
        // Check if this is the background rect (it should be full size or background color)
        if (fill === backgroundColor || fill === '#00000000') {
          bgRect = rect;
        }
      });
    }

    // Remove background if frame has background
    if (frame.style && frame.style !== 'none' && frame.backgroundColor && bgRect) {
      bgRect.remove();
    }
  }, [frame.style, frame.backgroundColor, backgroundColor]);

  // 4. Update logo styles and handle broken images
  useEffect(() => {
    if (disabled || !qrRef.current) return;

    const updateLogoStyles = () => {
      const svg = qrRef.current?.querySelector('svg');
      const img = svg?.querySelector('image');
      
      if (img && logo?.url) {
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // Add error handling for broken images
        img.onerror = () => {
          console.warn('Logo image failed to load:', logo.url);
          img.style.opacity = '0.3';
        };

        // Determine if we need to blend away the logo's white background
        const hasCustomBg = logo?.backgroundColor 
          && logo.backgroundColor !== '#FFFFFF' 
          && logo.backgroundColor !== '#ffffff'
          && logo.backgroundColor !== 'transparent';
        const isTransparent = logo?.backgroundColor === 'transparent';

        // Apply mix-blend-mode: multiply so white areas in the logo
        // take on the background colour instead of staying white
        if (hasCustomBg) {
          img.setAttribute('style', 'mix-blend-mode: multiply;');
        } else {
          img.removeAttribute('style');
        }
        
        if ((logo?.backgroundColor && !isTransparent) || logo?.borderColor) {
          let bbox = { x: 0, y: 0, width: 0, height: 0 };
          try { 
            // Only try if img is actually in DOM
            if (img.ownerSVGElement) bbox = img.getBBox(); 
          } catch (e) {
            bbox = {
              x: parseFloat(img.getAttribute('x')) || 400, // Reasonable defaults for 1000x1000
              y: parseFloat(img.getAttribute('y')) || 400,
              width: parseFloat(img.getAttribute('width')) || 200,
              height: parseFloat(img.getAttribute('height')) || 200
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
            
            const margin = w * 0.18;
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

    const timer = setTimeout(updateLogoStyles, 100);
    const timer2 = setTimeout(updateLogoStyles, 600); // Wait longer for logo to load
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [disabled, logo?.backgroundColor, logo?.borderColor, logo?.url, logo?.size, options]); // options dependency ensures re-run if QR code structure changes

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`relative rounded-[1vw] qr-preview-container overflow-hidden flex flex-col ${frame.style === 'banner' ? 'justify-between' : 'items-center justify-center'}`}
        style={{
          backgroundColor: frame.style && frame.style !== 'none' ? (frame.backgroundColor || '#FFFFFF') : '#FFFFFF',
          width: previewSize,
          minHeight: previewSize,
          height: 'auto',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          // Frame border styles
          ...(frame.style === 'simple' && {
            border: `4px solid ${frame.borderColor || '#000000'}`,
            borderRadius: '4px',
          }),
          ...(frame.style === 'rounded' && {
            border: `4px solid ${frame.borderColor || '#000000'}`,
            borderRadius: '16px',
          }),
          ...(frame.style === 'banner' && {
            border: `1px solid ${frame.borderColor || '#000000'}`,
            borderRadius: '12px',
          }),
          ...(frame.style && frame.style !== 'none' && { boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }),
        }}
      >
        {/* Banner Style: Top Bar */}
        {frame.style === 'banner' && (
          <div 
            className="w-full min-h-[2.5vw] z-10 flex items-center justify-center py-[0.5vw] px-[0.8vw] shrink-0 overflow-y-auto"
            style={{ backgroundColor: frame.borderColor || '#000000' }}
          >
            {frame.topText && (
              <span 
                className="text-center text-[0.7vw] font-black tracking-widest leading-[1.4] whitespace-pre-wrap break-words" 
                style={{ color: frame.textColor || '#FFFFFF' }}
              >
                {frame.topText}
              </span>
            )}
          </div>
        )}

          <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative" style={{ 
            padding: (frame.style && frame.style !== 'none') ? (frame.style === 'banner' ? '5%' : '6%') : '0',
          }}>
            {/* QR Code Container - Fixed aspect ratio to keep size consistent */}
            <div
              ref={qrRef}
              className={`qr-code-wrapper transition-all duration-500 overflow-visible flex items-center justify-center w-full aspect-square ${disabled ? 'opacity-20 grayscale blur-[2px]' : 'opacity-100'}`}
              style={{
                maxWidth: '100%',
                flexShrink: 0
              }}
            />

          {/* Simple/Rounded Frame Bottom Text */}
          {frame.style && frame.style !== 'none' && frame.style !== 'banner' && frame.text && (
            <div
              className="text-center font-black tracking-widest w-full z-10 flex items-center justify-center p-[0.3vw] shrink-0 overflow-y-auto max-h-[4vw]"
              style={{
                color: frame.textColor || '#000000',
                fontSize: '0.8vw',
                fontWeight: '900',
                lineHeight: '1.4'
              }}
            >
              <span className="break-words w-full px-[0.5vw] whitespace-pre-wrap">{frame.text}</span>
            </div>
          )}
          
          {/* Overlay for selection moved inside content area */}
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

        {/* Banner Style: Bottom Bar */}
        {frame.style === 'banner' && (
          <div 
            className="w-full min-h-[2.5vw] z-10 flex items-center justify-center py-[0.5vw] px-[0.8vw] shrink-0 overflow-y-auto"
            style={{ backgroundColor: frame.borderColor || '#000000' }}
          >
            {(frame.bottomText || frame.text) && (
              <span 
                className="text-center text-[0.7vw] font-black tracking-widest leading-[1.4] whitespace-pre-wrap break-words" 
                style={{ color: frame.textColor || '#FFFFFF' }}
              >
                {frame.bottomText || frame.text}
              </span>
            )}
          </div>
        )}
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