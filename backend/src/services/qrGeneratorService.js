import QRCode from 'qrcode';
import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';
import fileService from './fileService.js';
import fs from 'fs';
import path from 'path';

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
      // Generate base QR code
      const qrOptions = {
        errorCorrectionLevel,
        margin,
        width,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      };

      let qrBuffer;

      const cornerDotStyle = customization.cornerDotStyle || 'square';

      // Apply dot styling if any custom styles are requested
      if (dotStyle !== 'square' || cornerStyle !== 'square' || cornerDotStyle !== 'square') {
        qrBuffer = await this.applyDotStyle(content, qrOptions, dotStyle, cornerStyle, cornerDotStyle, foregroundColor, backgroundColor);
      } else {
        qrBuffer = await QRCode.toBuffer(content, qrOptions);
      }

      // Add logo if provided
      if (logo && logo.url) {
        // If logo.url is a local path, read from filesystem
        let logoPath = logo.url;
        if (logoPath.startsWith('/uploads/')) {
          logoPath = fileService.getFullPath(logoPath.replace('/uploads/', ''));
        }
        qrBuffer = await this.addLogo(qrBuffer, logoPath, logo, backgroundColor);
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
    const logoBgColor = logoConfig.backgroundColor || qrBackgroundColor || '#FFFFFF';
    const logoBorderColor = logoConfig.borderColor || '#E2E8F0';

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

    // Process logo
    const processedLogo = await sharp(logoBuffer)
      .resize(targetW, targetH, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer();

    // Create a container that fits the logo aspect ratio
    const margin = Math.floor(logoSize * 0.12);
    const containerW = targetW + margin;
    const containerH = targetH + margin;
    const radius = Math.floor(Math.min(containerW, containerH) * 0.15);
    const borderWidth = Math.max(2, Math.floor(Math.min(containerW, containerH) * 0.02));

    const svgContainer = `
      <svg width="${containerW}" height="${containerH}">
        <rect x="${borderWidth/2}" y="${borderWidth/2}" width="${containerW-borderWidth}" height="${containerH-borderWidth}" 
              rx="${radius}" ry="${radius}" 
              fill="${logoBgColor !== 'transparent' ? logoBgColor : '#FFFFFF'}"
              stroke="${logoBorderColor}" stroke-width="${borderWidth}"/>
      </svg>
    `;

    const logoLayer = await sharp(Buffer.from(svgContainer))
      .composite([{ input: processedLogo, gravity: 'center' }])
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
    const { style, text, textColor = '#000000', backgroundColor = '#FFFFFF' } = frameConfig;

    const qrImage = sharp(qrBuffer);
    const metadata = await qrImage.metadata();
    const qrSize = metadata.width;

    const borderWidth = Math.max(8, Math.floor(qrSize * 0.015));
    const padding = 50;
    const textAreaHeight = text ? 100 : 0;

    const baseSize = qrSize + padding * 2;
    const canvasW = baseSize;
    const canvasH = baseSize + textAreaHeight;

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // --- Draw background ---
    ctx.fillStyle = backgroundColor;
    if (style === 'rounded') {
      const radius = canvasW * 0.06;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvasW - radius, 0);
      ctx.quadraticCurveTo(canvasW, 0, canvasW, radius);
      ctx.lineTo(canvasW, canvasH - radius);
      ctx.quadraticCurveTo(canvasW, canvasH, canvasW - radius, canvasH);
      ctx.lineTo(radius, canvasH);
      ctx.quadraticCurveTo(0, canvasH, 0, canvasH - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // --- Draw border for simple and rounded ---
    if (style === 'simple' || style === 'rounded') {
      ctx.strokeStyle = textColor;
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

    // --- Draw the QR code image onto canvas ---
    const qrX = (canvasW - qrSize) / 2;
    const qrY = padding;
    const qrImg = await loadImage(qrBuffer);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // --- Draw text label at bottom ---
    if (text) {
      ctx.fillStyle = textColor;
      const fontSize = Math.max(20, Math.floor(canvasW * 0.042));
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvasW / 2, baseSize + textAreaHeight / 2);
    }

    // --- Banner: thick top+bottom bars ---
    if (style === 'banner') {
      const barH = Math.floor(canvasH * 0.1);
      ctx.fillStyle = textColor;
      ctx.fillRect(0, 0, canvasW, barH);
      ctx.fillRect(0, canvasH - barH, canvasW, barH);
      if (text) {
        ctx.fillStyle = backgroundColor;
        const fontSize = Math.max(18, Math.floor(barH * 0.5));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvasW / 2, canvasH - barH / 2);
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
    if (data.email) vcard += `EMAIL;TYPE=INTERNET:${data.email || ''}\n`;
    if (data.phone) vcard += `TEL;TYPE=VOICE:${data.phone || ''}\n`;
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
   * Generate QR code as different formats
   */
  async generateAsFormat(content, customization, format = 'png') {
    const qrBuffer = await this.generateQR(content, customization);

    switch (format) {
      case 'svg':
        return await QRCode.toString(content, {
          type: 'svg',
          color: {
            dark: customization.foregroundColor || '#000000',
            light: customization.backgroundColor || '#FFFFFF'
          }
        });

      case 'jpeg':
      case 'jpg':
        return await sharp(qrBuffer).jpeg({ quality: 90 }).toBuffer();

      case 'webp':
        return await sharp(qrBuffer).webp({ quality: 90 }).toBuffer();

      default:
        return qrBuffer;
    }
  }
}

export default new QRGeneratorService();