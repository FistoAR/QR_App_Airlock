import QRCode from 'qrcode';
import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';
import fileService from './fileService.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

class QRGeneratorService {

  /**
   * Generate QR code with customization
   */
  async generateQR(content, customization = {}) {
    const {
      foregroundColor = '#000000',
      backgroundColor = '#FFFFFF',
      errorCorrectionLevel = 'M',
      margin = 4,
      width = 1000,
      logo = null,
      dotStyle = 'square',
      cornerStyle = 'square',
      frame = null
    } = customization;

    try {
      // Smart background handling for transparency
      const hasFrameBackground = frame && frame.style !== 'none' && (frame.backgroundColor || frame.backgroundColor === 'transparent');
      
      // If we need transparency, we use a temporary bg color to remove.
      // CRITICAL: If the dot color (foregroundColor) is white, we CANNOT use white as the removal color
      // because we'll erase the dots too! We'll use a neon green fallback in that case.
      const isDotsWhite = foregroundColor.toUpperCase() === '#FFFFFF' || foregroundColor.toUpperCase() === '#FFF';
      const tempBgColor = isDotsWhite ? '#00FF00' : '#FFFFFF';
      
      const qrBgColor = hasFrameBackground ? tempBgColor : backgroundColor;
      const shouldMakeQRTransparent = hasFrameBackground || backgroundColor === 'transparent';

      // Generate base QR code
      const qrOptions = {
        errorCorrectionLevel,
        margin,
        width,
        color: {
          dark: foregroundColor,
          light: qrBgColor
        }
      };

      let qrBuffer;

      const cornerDotStyle = customization.cornerDotStyle || 'square';

      // Apply dot styling if any custom styles are requested
      if (dotStyle !== 'square' || cornerStyle !== 'square' || cornerDotStyle !== 'square') {
        qrBuffer = await this.applyDotStyle(content, qrOptions, dotStyle, cornerStyle, cornerDotStyle, foregroundColor, qrBgColor);
      } else {
        qrBuffer = await QRCode.toBuffer(content, qrOptions);
      }

      // Make QR background transparent if needed
      if (shouldMakeQRTransparent) {
        qrBuffer = await this.makeBackgroundTransparent(qrBuffer, qrBgColor, 5); // Added small tolerance
      }

      // Add logo if provided (after transparency so its bg survives)
      if (logo && logo.url) {
        // If logo.url is a local path, read from filesystem
        let logoPath = logo.url;
        if (logoPath.startsWith('/uploads/')) {
          logoPath = fileService.getFullPath(logoPath.replace('/uploads/', ''));
        }
        qrBuffer = await this.addLogo(qrBuffer, logoPath, logo, qrBgColor);
      }

      // Add frame if provided
      if (frame && frame.style !== 'none') {
        qrBuffer = await this.addFrame(qrBuffer, frame);
      }

      return qrBuffer;
    } catch (error) {
      console.error('QR Generation Error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Make QR code background transparent (remove white background)
   */
  async makeBackgroundTransparent(qrBuffer, bgColorToRemove = '#FFFFFF', tolerance = 0) {
    const image = sharp(qrBuffer);
    const metadata = await image.metadata();
    
    // Convert to RGBA to support transparency
    const data = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = data.info;
    const pixels = data.data;

    // Parse the color to remove (convert hex to RGB)
    const hex = bgColorToRemove.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Iterate through pixels and make matching colors transparent
    for (let i = 0; i < pixels.length; i += 4) {
      const pixelR = pixels[i];
      const pixelG = pixels[i + 1];
      const pixelB = pixels[i + 2];

      // If pixel is within tolerance of the target colour, make transparent
      if (Math.abs(pixelR - r) <= tolerance &&
          Math.abs(pixelG - g) <= tolerance &&
          Math.abs(pixelB - b) <= tolerance) {
        pixels[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    // Convert back to PNG with transparency
    return sharp(Buffer.from(pixels), {
      raw: {
        width,
        height,
        channels: 4
      }
    })
    .png()
    .toBuffer();
  }

  /**
   * Apply custom dot styling to QR code
   */
  async applyDotStyle(content, options, dotStyle, cornerStyle, cornerDotStyle, fgColor, bgColor) {
    const qr = QRCode.create(content, options);
    const { modules } = qr;
    const { size, data } = modules;

    // Calculate final image dimension
    const margin = options.margin || 4;
    const width = options.width || 1000;
    const moduleSize = width / (size + margin * 2);

    const canvas = createCanvas(width, width);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, width);

    // Draw modules
    ctx.fillStyle = fgColor;
    const offset = margin * moduleSize;

    const isCorner = (row, col) => {
      if (row < 7 && col < 7) return 'tl';
      if (row < 7 && col >= size - 7) return 'tr';
      if (row >= size - 7 && col < 7) return 'bl';
      return null;
    };

    const drawnCorners = new Set();

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const isDark = data[row * size + col];
        if (!isDark) continue;

        const corner = isCorner(row, col);
        if (corner) {
          if (!drawnCorners.has(corner)) {
            let cx = offset, cy = offset;
            if (corner === 'tr') cx = offset + (size - 7) * moduleSize;
            if (corner === 'bl') cy = offset + (size - 7) * moduleSize;

            this.drawCorner(ctx, cx, cy, moduleSize * 7, cornerStyle, cornerDotStyle);
            drawnCorners.add(corner);
          }
          continue;
        }

        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;
        this.drawModule(ctx, x, y, moduleSize, dotStyle);
      }
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Draw corner square
   */
  drawCorner(ctx, x, y, totalSize, style, dotStyle = 'square') {
    const moduleSize = totalSize / 7;
    const outerRadius = style === 'extra-rounded' ? totalSize * 0.3 : style === 'dot' ? totalSize * 0.5 : 0;
    const innerPadding = moduleSize * 2;
    const innerSize = totalSize - innerPadding * 2;

    // Draw outer frame (ring)
    ctx.beginPath();
    if (style === 'dot') {
      // Full circle outer ring
      ctx.arc(x + totalSize / 2, y + totalSize / 2, totalSize / 2, 0, Math.PI * 2);
      ctx.arc(x + totalSize / 2, y + totalSize / 2, totalSize / 2 - moduleSize, 0, Math.PI * 2, true);
    } else {
      this.roundRectPath(ctx, x, y, totalSize, totalSize, outerRadius);
      this.roundRectPath(ctx, x + moduleSize, y + moduleSize, totalSize - moduleSize * 2, totalSize - moduleSize * 2, (outerRadius * 0.8) || 0, true);
    }
    ctx.fill();

    // Draw inner dot/ball
    ctx.beginPath();
    if (dotStyle === 'dot') {
      // Perfect circle inner ball
      const cx = x + totalSize / 2;
      const cy = y + totalSize / 2;
      const r = innerSize / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (dotStyle === 'extra-rounded') {
      const innerRadius = innerSize * 0.4;
      this.roundRectPath(ctx, x + innerPadding, y + innerPadding, innerSize, innerSize, innerRadius);
    } else {
      this.roundRectPath(ctx, x + innerPadding, y + innerPadding, innerSize, innerSize, 0);
    }
    ctx.fill();
  }

  /**
   * Draw a single QR module with custom style
   */
  drawModule(ctx, x, y, size, style) {
    const padding = size * 0.05; // Reduced padding for denser look
    const actualSize = size - padding * 2;

    switch (style) {
      case 'dots':
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, actualSize / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'rounded':
        this.roundRect(ctx, x + padding, y + padding, actualSize, actualSize, actualSize * 0.4);
        break;

      case 'classy': {
        const p = size * 0.05;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + p);
        ctx.lineTo(x + size - p, y + size / 2);
        ctx.lineTo(x + size / 2, y + size - p);
        ctx.lineTo(x + p, y + size / 2);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'extra-rounded':
        this.roundRect(ctx, x + padding, y + padding, actualSize, actualSize, actualSize * 0.5);
        break;

      default:
        ctx.fillRect(x, y, size, size);
    }
  }

  /**
   * Draw rounded rectangle path (for complex shapes)
   */
  roundRectPath(ctx, x, y, width, height, radius, counterClockwise = false) {
    if (radius > width / 2) radius = width / 2;
    if (radius > height / 2) radius = height / 2;

    if (counterClockwise) {
      ctx.moveTo(x + radius, y);
      ctx.quadraticCurveTo(x, y, x, y + radius);
      ctx.lineTo(x, y + height - radius);
      ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
      ctx.lineTo(x + width - radius, y + height);
      ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
      ctx.lineTo(x + width, y + radius);
      ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
      ctx.lineTo(x + radius, y);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
  }

  /**
   * Draw rounded rectangle
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
  }

  /**
   * Add logo to center of QR code
   */
  async addLogo(qrBuffer, logoPath, logoConfig, qrBackgroundColor = '#FFFFFF') {
    const qrImage = sharp(qrBuffer);
    const metadata = await qrImage.metadata();
    const qrSize = metadata.width;

    const logoSizeRatio = typeof logoConfig === 'number' ? logoConfig : (logoConfig.size || 0.25);
    // Use the user's chosen backgroundColor. If explicitly 'transparent', honour it.
    // Only fall back to white when no backgroundColor is provided at all.
    const isTransparentBg = logoConfig.backgroundColor === 'transparent';
    const logoBgColor = logoConfig.backgroundColor && !isTransparentBg
      ? logoConfig.backgroundColor
      : (isTransparentBg ? 'transparent' : '#FFFFFF');
    const logoBorderColor = isTransparentBg
      ? 'none'
      : (logoConfig.borderColor || '#E2E8F0');

    const logoSize = Math.floor(qrSize * logoSizeRatio);

    // Load logo
    let logoBuffer;
    if (logoPath.startsWith('http')) {
      const response = await fetch(logoPath);
      logoBuffer = Buffer.from(await response.arrayBuffer());
    } else if (logoPath.startsWith('data:')) {
      logoBuffer = Buffer.from(logoPath.split(',')[1], 'base64');
    } else {
      // Read from local file
      logoBuffer = fs.readFileSync(logoPath);
    }

    // Get metadata for aspect ratio
    const logoMeta = await sharp(logoBuffer).metadata();
    const aspectRatio = logoMeta.width / logoMeta.height;

    let targetW, targetH;
    if (aspectRatio > 1) {
      // Horizontal logo
      targetW = logoSize;
      targetH = Math.floor(logoSize / aspectRatio);
    } else {
      // Vertical or square logo
      targetH = logoSize;
      targetW = Math.floor(logoSize * aspectRatio);
    }

    // Use multiply blend when user has set a non-white background.
    // multiply: white(255) × color = color, so the logo's white bg
    // naturally becomes the container colour with smooth anti-aliased edges.
    const needsBlend = !isTransparentBg && logoBgColor !== '#FFFFFF' && logoBgColor !== '#ffffff';

    // Process logo
    let processedLogo;
    if (needsBlend) {
      // For multiply blending, we need a solid white background
      processedLogo = await sharp(logoBuffer)
        .resize(targetW, targetH, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .toBuffer();
    } else if (isTransparentBg) {
      // For transparency, we resize with alpha 0 and then strip white
      const logoTmp = await sharp(logoBuffer)
        .resize(targetW, targetH, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .ensureAlpha()
        .toBuffer();
      processedLogo = await this.makeBackgroundTransparent(logoTmp, '#FFFFFF', 35);
    } else {
      // Normal case (white background)
      processedLogo = await sharp(logoBuffer)
        .resize(targetW, targetH, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer();
    }

    // Create a container that fits the logo aspect ratio
    const margin = Math.floor(logoSize * 0.12);
    const containerW = targetW + margin;
    const containerH = targetH + margin;
    const radius = Math.floor(Math.min(containerW, containerH) * 0.15);
    const borderWidth = Math.max(2, Math.floor(Math.min(containerW, containerH) * 0.02));

    const svgFill = isTransparentBg ? 'none' : logoBgColor;
    const svgStroke = isTransparentBg ? 'none' : logoBorderColor;
    const svgContainer = `
      <svg width="${containerW}" height="${containerH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${borderWidth/2}" y="${borderWidth/2}" width="${containerW-borderWidth}" height="${containerH-borderWidth}" 
              rx="${radius}" ry="${radius}" 
              fill="${svgFill}"
              stroke="${svgStroke}" stroke-width="${isTransparentBg ? 0 : borderWidth}"/>
      </svg>
    `;

    const logoLayer = await sharp(Buffer.from(svgContainer))
      .composite([{
        input: processedLogo,
        gravity: 'center',
        blend: needsBlend ? 'multiply' : 'over'
      }])
      .png()
      .toBuffer();

    const logoLeft = Math.floor((qrSize - containerW) / 2);
    const logoTop = Math.floor((qrSize - containerH) / 2);

    return await sharp(qrBuffer)
      .composite([{
        input: logoLayer,
        left: logoLeft,
        top: logoTop
      }])
      .png()
      .toBuffer();
  }

  /**
   * Add frame around QR code
   */
  async addFrame(qrBuffer, frameConfig) {
    const { 
      style, 
      text, 
      topText, 
      bottomText,
      borderColor = '#000000',
      backgroundColor = '#FFFFFF' 
    } = frameConfig;

    // Smart text color: if not explicitly set, use white for banner (dark bars), black for simple/rounded
    const textColor = frameConfig.textColor 
      ? frameConfig.textColor 
      : (style === 'banner' ? '#FFFFFF' : '#000000');

    const qrImage = sharp(qrBuffer);
    const metadata = await qrImage.metadata();
    const qrSize = metadata.width;

    const borderWidth = Math.max(6, Math.floor(qrSize * 0.012));
    // Percentage-based padding: 2.5% for banner, 3% for simple/rounded
    const padding = style === 'banner' 
      ? Math.floor(qrSize * 0.025) 
      : Math.floor(qrSize * 0.03);
    
    // Frame padding - overall padding around entire image
    const framePadding = Math.floor(qrSize * 0.04);
    
    // --- Pre-calculate text wrapping for simple/rounded ---
    let lines = [];
    let textAreaHeight = 0;
    // Match frontend: responsive font size based on QR
    const fontSize = Math.max(26, Math.floor(qrSize * 0.06));
    const lineHeight = fontSize * 1.3;

    if (text && (style === 'simple' || style === 'rounded')) {
      const tempCanvas = createCanvas(100, 100);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
      // Allow full width for text - more generous for text area
      const maxWidth = qrSize + (padding * 2) - 10;
      lines = this.wrapTextWithNewlines(tempCtx, text, maxWidth);
      // Calculate height for text area below QR
      textAreaHeight = (lines.length * lineHeight) + (padding * 2);
    }

    // For simple/rounded: canvas has QR centered with padding, then text below
    const baseSize = qrSize + (padding * 2);
    let topBarH = 0;
    let botBarH = 0;
    let bannerFontBase = 0; // Store for use when drawing bars

    // --- Pre-calculate banner bar heights based on text content ---
    if (style === 'banner') {
      const tempC = createCanvas(100, 100);
      const tempCtx = tempC.getContext('2d');
      bannerFontBase = Math.max(20, Math.floor(qrSize * 0.052));
      tempCtx.font = `bold ${bannerFontBase}px Arial, sans-serif`;
      const maxBannerTextW = qrSize - 15; // Slightly better margin

      if (topText) {
        const topLines = this.wrapTextWithNewlines(tempCtx, topText, maxBannerTextW);
        const lineH = bannerFontBase * 1.4;
        topBarH = Math.max(
          Math.floor(qrSize * 0.085),
          Math.ceil(topLines.length * lineH) + bannerFontBase * 0.4
        );
      } else {
        topBarH = Math.floor(qrSize * 0.085);
      }

      const bText = bottomText || text;
      if (bText) {
        const botLines = this.wrapTextWithNewlines(tempCtx, bText, maxBannerTextW);
        const lineH = bannerFontBase * 1.4;
        botBarH = Math.max(
          Math.floor(qrSize * 0.085),
          Math.ceil(botLines.length * lineH) + bannerFontBase * 0.4
        );
      } else {
        botBarH = Math.floor(qrSize * 0.085);
      }
    }

    const canvasW = baseSize + (framePadding * 2);
    const canvasH = baseSize + textAreaHeight + topBarH + botBarH + (framePadding * 2);

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // --- Draw background with border radius for entire frame ---
    ctx.fillStyle = backgroundColor;
    // 'simple' (normal) type gets no border radius; banner and rounded get rounded corners
    const outerRadius = style === 'simple' ? 0 : Math.floor(Math.min(canvasW, canvasH) * 0.08);
    
    // Draw rounded background for entire frame (with frame padding)
    ctx.beginPath();
    ctx.moveTo(outerRadius, 0);
    ctx.lineTo(canvasW - outerRadius, 0);
    ctx.quadraticCurveTo(canvasW, 0, canvasW, outerRadius);
    ctx.lineTo(canvasW, canvasH - outerRadius);
    ctx.quadraticCurveTo(canvasW, canvasH, canvasW - outerRadius, canvasH);
    ctx.lineTo(outerRadius, canvasH);
    ctx.quadraticCurveTo(0, canvasH, 0, canvasH - outerRadius);
    ctx.lineTo(0, outerRadius);
    ctx.quadraticCurveTo(0, 0, outerRadius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Draw border around entire frame (with frame padding)
    ctx.strokeStyle = borderColor;
    const borderThickness = Math.max(2, Math.floor(qrSize * 0.008));
    ctx.lineWidth = borderThickness;
    ctx.beginPath();
    ctx.moveTo(outerRadius + borderThickness / 2, borderThickness / 2);
    ctx.lineTo(canvasW - outerRadius - borderThickness / 2, borderThickness / 2);
    ctx.quadraticCurveTo(canvasW - borderThickness / 2, borderThickness / 2, canvasW - borderThickness / 2, outerRadius + borderThickness / 2);
    ctx.lineTo(canvasW - borderThickness / 2, canvasH - outerRadius - borderThickness / 2);
    ctx.quadraticCurveTo(canvasW - borderThickness / 2, canvasH - borderThickness / 2, canvasW - outerRadius - borderThickness / 2, canvasH - borderThickness / 2);
    ctx.lineTo(outerRadius + borderThickness / 2, canvasH - borderThickness / 2);
    ctx.quadraticCurveTo(borderThickness / 2, canvasH - borderThickness / 2, borderThickness / 2, canvasH - outerRadius - borderThickness / 2);
    ctx.lineTo(borderThickness / 2, outerRadius + borderThickness / 2);
    ctx.quadraticCurveTo(borderThickness / 2, borderThickness / 2, outerRadius + borderThickness / 2, borderThickness / 2);
    ctx.closePath();
    ctx.stroke();
    
    // Clip to rounded area for content
    ctx.beginPath();
    ctx.moveTo(outerRadius, 0);
    ctx.lineTo(canvasW - outerRadius, 0);
    ctx.quadraticCurveTo(canvasW, 0, canvasW, outerRadius);
    ctx.lineTo(canvasW, canvasH - outerRadius);
    ctx.quadraticCurveTo(canvasW, canvasH, canvasW - outerRadius, canvasH);
    ctx.lineTo(outerRadius, canvasH);
    ctx.quadraticCurveTo(0, canvasH, 0, canvasH - outerRadius);
    ctx.lineTo(0, outerRadius);
    ctx.quadraticCurveTo(0, 0, outerRadius, 0);
    ctx.closePath();
    ctx.clip();

    // --- For Banner: draw bars (plain rectangles, corners handled by frame) ---
    if (style === 'banner') {
      ctx.fillStyle = borderColor;
      // Banner bars extend edge-to-edge for full frame coverage, no padding gaps
      ctx.fillRect(0, 0, canvasW, topBarH);
      ctx.fillRect(0, canvasH - botBarH, canvasW, botBarH);
    }

    // --- Draw the QR code image onto canvas ---
    const qrX = framePadding + padding; // QR starts after frame padding + internal padding
    const qrY = framePadding + padding + (style === 'banner' ? topBarH : 0);
    const qrImg = await loadImage(qrBuffer);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Restore clip after drawing QR (for rounded style)
    if (style === 'rounded') {
      ctx.restore();
    }

    // --- Draw border for simple and rounded ---
    if (style === 'simple' || style === 'rounded') {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      const half = borderWidth / 2;
      if (style === 'rounded') {
        const radius = canvasW * 0.06;
        ctx.beginPath();
        ctx.moveTo(radius + half, half);
        ctx.lineTo(canvasW - radius - half, half);
        ctx.quadraticCurveTo(canvasW - half, half, canvasW - half, radius + half);
        ctx.lineTo(canvasW - half, canvasH - radius - half);
        ctx.quadraticCurveTo(canvasW - half, canvasH - half, canvasW - radius - half, canvasH - half);
        ctx.lineTo(radius + half, canvasH - half);
        ctx.quadraticCurveTo(half, canvasH - half, half, canvasH - radius - half);
        ctx.lineTo(half, radius + half);
        ctx.quadraticCurveTo(half, half, radius + half, half);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeRect(half, half, canvasW - borderWidth, canvasH - borderWidth);
      }
    }

    // --- Draw text label at bottom (Simple/Rounded) ---
    if (lines.length > 0 && (style === 'simple' || style === 'rounded')) {
      // Draw text below QR
      const textAreaStart = framePadding + padding + qrSize;
      const textCenterY = textAreaStart + (textAreaHeight / 2);
      
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      
      lines.forEach((line, i) => {
        const yPos = textCenterY + (i - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, canvasW / 2, yPos);
      });
    }

    // --- Banner: draw text ON TOP of bars ---
    if (style === 'banner') {
      const bannerFontSize = Math.max(20, Math.floor(qrSize * 0.052));
      ctx.font = `bold ${bannerFontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      const maxWidth = qrSize - 15;
      const bannerLineHeight = bannerFontSize * 1.4;

      // Top text — centered vertically inside topBarH
      if (topText) {
        const topLines = this.wrapTextWithNewlines(ctx, topText, maxWidth);
        const topCenterY = topBarH / 2;
        topLines.forEach((line, i) => {
          const yOffset = (i - (topLines.length - 1) / 2) * bannerLineHeight;
          ctx.fillText(line, canvasW / 2, topCenterY + yOffset);
        });
      }

      // Bottom text — centered vertically inside botBarH
      const bText = bottomText || text;
      if (bText) {
        const botLines = this.wrapTextWithNewlines(ctx, bText, maxWidth);
        const botCenterY = canvasH - botBarH / 2;
        botLines.forEach((line, i) => {
          const yOffset = (i - (botLines.length - 1) / 2) * bannerLineHeight;
          ctx.fillText(line, canvasW / 2, botCenterY + yOffset);
        });
      }
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Save QR code image to file system
   */
  async saveQRCode(qrBuffer, userId) {
    // Create a mock file object for fileService
    const mockFile = {
      buffer: qrBuffer,
      originalname: `qr-${Date.now()}.png`,
      mimetype: 'image/png'
    };

    // Use fileService to handle storage (local or FTP)
    const result = await fileService.uploadFile(mockFile, {
      folder: 'qr-codes',
      userId: userId
    });

    return {
      url: result.url,
      path: result.path,
      fileName: result.storedFileName,
    };
  }

  /**
   * Generate QR content string based on type
   */
  generateContentString(type, data) {
    switch (type) {
      case 'url':
        return data.target || data.url;

      case 'vcard':
        return this.generateVCard(data);

      case 'text':
        return data.content || data.text;

      case 'wifi':
        return `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid};P:${data.password};H:${data.hidden ? 'true' : 'false'};;`;

      case 'email':
        const emailTo = data.email || data.to || data.address || '';
        return `mailto:${emailTo}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`;

      case 'sms':
        const smsTo = data.phoneNumber || data.phone || '';
        return `sms:${smsTo}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;

      case 'location': {
        const addressQuery = [data.address, data.postalCode].filter(Boolean).join(' ');
        return `https://maps.google.com/?q=${encodeURIComponent(addressQuery)}`;
      }

      default:
        return data.toString();
    }
  }

  /**
   * Generate vCard string
   */
  generateVCard(data) {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';

    if (data.firstName || data.lastName) {
      vcard += `N:${data.lastName || ''};${data.firstName || ''}\n`;
      vcard += `FN:${data.firstName || ''} ${data.lastName || ''}\n`;
    }

    if (data.organization) vcard += `ORG:${data.organization}\n`;
    if (data.title) vcard += `TITLE:${data.title}\n`;
    if (data.email) vcard += `EMAIL;TYPE=WORK,INTERNET:${data.email || ''}\n`;
    if (data.phone) vcard += `TEL;TYPE=WORK,VOICE:${data.phone || ''}\n`;
    if (data.mobile) vcard += `TEL;TYPE=CELL,VOICE:${data.mobile || ''}\n`;
    if (data.fax) vcard += `TEL;TYPE=FAX:${data.fax || ''}\n`;
    if (data.website) vcard += `URL:${data.website}\n`;
    if (data.linkedin) {
      vcard += `X-SOCIALPROFILE;TYPE=linkedin:${data.linkedin}\n`;
      vcard += `X-LINKEDIN:${data.linkedin}\n`;
      vcard += `URL:${data.linkedin}\n`;
    }

    if (data.address) {
      const addr = data.address;
      vcard += `ADR;TYPE=WORK:;;${addr.street || ''};${addr.city || ''};${addr.state || ''};${addr.zip || ''};${addr.country || ''}\n`;
    }

    if (data.birthday) {
      const bday = new Date(data.birthday);
      vcard += `BDAY:${bday.toISOString().split('T')[0].replace(/-/g, '')}\n`;
    }

    if (data.notes) vcard += `NOTE:${data.notes}\n`;
    if (data.photo) vcard += `PHOTO;VALUE=URI:${data.photo}\n`;

    vcard += 'END:VCARD';
    return vcard;
  }

  /**
   * Helper to convert image to DataURL for SVG embedding
   */
  async getLogoAsDataURL(logoPath) {
    if (!logoPath) return '';
    if (logoPath.startsWith('data:')) return logoPath;
    
    console.log(`[LogoToDataURL] Processing logo: ${logoPath}`);
    try {
      let buffer;
      let mime = 'image/png';
      
      // 1. If it's a URL, try fetching it
      if (logoPath.startsWith('http')) {
        try {
          console.log(`[LogoToDataURL] Fetching URL: ${logoPath}`);
          const response = await axios.get(logoPath, { 
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'Accept': 'image/*' }
          });
          buffer = Buffer.from(response.data);
          mime = response.headers['content-type'] || 'image/png';
          console.log(`[LogoToDataURL] Fetch successful. Mime: ${mime}, Size: ${buffer.length}`);
        } catch (axiosErr) {
          console.error(`[LogoToDataURL] Axios fetch failed for ${logoPath}:`, axiosErr.message);
          
          // Fallback to local disk only if we are NOT using FTP
          if (!fileService.useFtp && logoPath.includes('/uploads/')) {
            const uploadMatch = logoPath.match(/\/uploads\/(.+)$/);
            const fileName = uploadMatch ? uploadMatch[1] : null;
            if (fileName) {
              const localPath = path.join(fileService.uploadsDir, fileName);
              if (fs.existsSync(localPath)) {
                console.log(`[LogoToDataURL] Fallback: Reading from local disk: ${localPath}`);
                buffer = fs.readFileSync(localPath);
              }
            }
          }
        }
      } else {
        // 2. Direct path or internal referenc
        const fileName = logoPath.startsWith('/uploads/') ? logoPath.replace('/uploads/', '') : logoPath;
        const fullPath = fileService.getFullPath(fileName);
        
        // If fileService.getFullPath returns a URL (when USE_FTP is true), we need to fetch it
        if (fullPath.startsWith('http')) {
          console.log(`[LogoToDataURL] Internal path resolved to URL: ${fullPath}`);
          const response = await axios.get(fullPath, { responseType: 'arraybuffer', timeout: 5000 });
          buffer = Buffer.from(response.data);
          mime = response.headers['content-type'] || 'image/png';
        } else if (fs.existsSync(fullPath)) {
          console.log(`[LogoToDataURL] Reading directly from disk: ${fullPath}`);
          buffer = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
        }
      }
      
      if (!buffer) {
        console.warn(`[LogoToDataURL] Could not retrieve logo buffer for: ${logoPath}`);
        return '';
      }
      
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error('[LogoToDataURL] Critical Error:', e);
      return '';
    }
  }

  /**
   * Generate QR code as different formats
   */
  async generateAsFormat(content, customization, format = 'png') {
    if (format === 'svg') {
      const {
        foregroundColor = '#000000',
        backgroundColor = '#FFFFFF',
        margin = 4,
        width = 1000,
        logo = null,
        frame = null
      } = customization;

      // 1. Get base QR SVG from 'qrcode' lib
      let qrSvg = await QRCode.toString(content, {
        type: 'svg',
        margin: margin,
        width: width,
        color: { dark: foregroundColor, light: backgroundColor }
      });

      // Remove the <?xml...?> tag if present to nest easily
      qrSvg = qrSvg.replace(/<\?xml.*?\?>/, '').trim();

      // 2. Add Logo to SVG if exists
      if (logo && logo.url) {
        const dataUrl = await this.getLogoAsDataURL(logo.url);
        if (dataUrl) {
           const lSize = width * (logo.size || 0.25);
           const lBg = logo.backgroundColor || backgroundColor || '#FFFFFF';
           const lBorder = logo.borderColor || '#E2E8F0';
           const lPos = (width - lSize) / 2;
           const radius = lSize * 0.15;
           const bWidth = Math.max(2, lSize * 0.02);

           const logoSvg = `
             <g id="logo-group">
               <rect x="${lPos - bWidth/2}" y="${lPos - bWidth/2}" width="${lSize + bWidth}" height="${lSize + bWidth}" 
                     rx="${radius}" ry="${radius}" fill="${lBg}" stroke="${lBorder}" stroke-width="${bWidth}" />
               <image x="${lPos}" y="${lPos}" width="${lSize}" height="${lSize}" href="${dataUrl}" xlink:href="${dataUrl}" preserveAspectRatio="xMidYMid meet" />
             </g>`;
           
           const lastSvgCloseIdx = qrSvg.lastIndexOf('</svg>');
           if (lastSvgCloseIdx !== -1) {
             qrSvg = qrSvg.substring(0, lastSvgCloseIdx) + logoSvg + '</svg>';
           } else {
             qrSvg += logoSvg;
           }
           
           // Ensure it has xlink namespace if logo added
           if (!qrSvg.includes('xmlns:xlink')) {
              qrSvg = qrSvg.replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
           }
        }
      }

      // 3. Add Frame to SVG if exists
      if (frame && frame.style !== 'none') {
        const padding = width * 0.08;
        const textHeight = frame.text ? width * 0.12 : 0;
        const totalW = width + padding * 2;
        const totalH = width + padding * 2 + textHeight;
        const fBg = frame.backgroundColor || '#FFFFFF';
        const fStyle = frame.style;
        // Smart text color: white for banner (dark bars), black for simple/rounded
        const fText = frame.textColor 
          ? frame.textColor 
          : (fStyle === 'banner' ? '#FFFFFF' : '#000000');

        let frameContent = '';
        if (fStyle === 'simple' || fStyle === 'rounded') {
           const radius = fStyle === 'rounded' ? totalW * 0.06 : 0;
           const bW = Math.max(8, width * 0.015);
           const bColor = frame.borderColor || fText;
           frameContent = `<rect x="${bW/2}" y="${bW/2}" width="${totalW-bW}" height="${totalH-bW}" rx="${radius}" fill="${fBg}" stroke="${bColor}" stroke-width="${bW}" />`;
        } else if (fStyle === 'banner') {
           const barH = totalH * 0.12;
           const bColor = frame.borderColor || fText;
           frameContent = `
             <rect width="${totalW}" height="${totalH}" fill="${fBg}" />
             <rect width="${totalW}" height="${barH}" fill="${bColor}" />
             <rect y="${totalH - barH}" width="${totalW}" height="${barH}" fill="${bColor}" />
           `;
           
           const fontSize = Math.floor(barH * 0.45);
           // Add Top Text
           if (frame.topText) {
             frameContent += `<text x="${totalW/2}" y="${barH/2}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="${fText}">${frame.topText}</text>`;
           }
           // Add Bottom Text
           const bText = frame.bottomText || frame.text;
           if (bText) {
             frameContent += `<text x="${totalW/2}" y="${totalH - barH/2}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="${fText}">${bText}</text>`;
           }
        } else {
           frameContent = `<rect width="${totalW}" height="${totalH}" fill="${fBg}" />`;
        }

        // Add Text for simple/rounded with basic SVG wrapping support
        if (frame.text && (fStyle === 'simple' || fStyle === 'rounded')) {
          const fontSize = Math.floor(width * 0.05);
          const lines = frame.text.split(' '); // Simple wrapping for SVG
          const chunkedLines = [];
          let current = '';
          lines.forEach(word => {
            if ((current + word).length > 20) {
              chunkedLines.push(current.trim());
              current = word + ' ';
            } else {
              current += word + ' ';
            }
          });
          chunkedLines.push(current.trim());

          const startTy = totalH - textHeight/1.5 - padding/2;
          frameContent += `<text x="${totalW/2}" y="${startTy}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="${fText}">`;
          chunkedLines.forEach((line, i) => {
            frameContent += `<tspan x="${totalW/2}" dy="${i === 0 ? 0 : fontSize * 1.2}">${line}</tspan>`;
          });
          frameContent += `</text>`;
        }

        const finalSvg = `<?xml version="1.0" standalone="no"?>
<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${frameContent}
  <g transform="translate(${padding}, ${padding})">
    ${qrSvg}
  </g>
</svg>`;
        return finalSvg;
      }

      return `<?xml version="1.0" standalone="no"?>\n${qrSvg}`;
    }

    const qrBuffer = await this.generateQR(content, customization);

    switch (format) {
      case 'jpeg':
      case 'jpg':
        return await sharp(qrBuffer).jpeg({ quality: 90 }).toBuffer();
      case 'webp':
        return await sharp(qrBuffer).webp({ quality: 90 }).toBuffer();
      default:
        return qrBuffer;
    }
  }

  /**
   * Helper to wrap text into multiple lines, respecting newlines
   */
  wrapTextWithNewlines(ctx, text, maxWidth) {
    if (!text) return [];
    
    // First split by newlines to preserve explicit line breaks
    const textLines = text.split('\n');
    const result = [];
    
    // Then apply word wrapping to each line
    textLines.forEach(line => {
      if (!line) {
        result.push(''); // Empty line
      } else {
        const words = line.split(' ');
        let currentLine = words[0] || '';
        
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          if (!word) continue; // Skip empty words
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const width = ctx.measureText(testLine).width;
          
          if (width < maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) result.push(currentLine);
            currentLine = word;
          }
        }
        
        if (currentLine) result.push(currentLine);
      }
    });
    
    return result;
  }

  /**
   * Helper to wrap text into multiple lines for Canvas
   */
  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  }
}

export default new QRGeneratorService();