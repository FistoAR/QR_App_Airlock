import express from 'express';
import QRCode from '../models/QRCode.js';
import Content from '../models/Content.js';
import Scan from '../models/Scan.js';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import fs from 'fs';
import path from 'path';
import fileService from '../services/fileService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Track scan analytics
 */
const trackScan = async (qrCodeId, req) => {
  try {
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.ip
      || req.connection?.remoteAddress
      || '';
    const userAgent = req.headers['user-agent'] || '';

    // Parse user agent
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // Clean IP (strip IPv6 prefix)
    const cleanIp = rawIp.replace('::ffff:', '').replace(/^::1$/, '127.0.0.1').trim();

    // Try geoip-lite first (works for public IPs)
    let geo = geoip.lookup(cleanIp) || {};

    // Fallback: ip-api.com for IPs geoip-lite can't resolve
    // (Skip obviously private/loopback IPs — they can't be looked up externally either)
    const isPrivate = !cleanIp
      || cleanIp === '127.0.0.1'
      || cleanIp.startsWith('192.168.')
      || cleanIp.startsWith('10.')
      || cleanIp.startsWith('172.');

    if (!geo.country && !isPrivate) {
      try {
        const resp = await fetch(
          `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,lat,lon,timezone`,
          { signal: AbortSignal.timeout(3000) }
        );
        const data = await resp.json();
        if (data.status === 'success') {
          geo = {
            country: data.countryCode,
            region: data.regionName,
            city: data.city,
            ll: [data.lat, data.lon],
            timezone: data.timezone
          };
        }
      } catch { /* ignore — analytics is non-critical */ }
    }

    // Determine device type
    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    // Create scan record — location may be empty for private IPs (browser GPS fills it later)
    await Scan.create({
      qrCode: qrCodeId,
      ipAddress: cleanIp,
      userAgent,
      device: {
        type: deviceType,
        browser: browser.name || 'Unknown',
        os: os.name || 'Unknown',
        vendor: device.vendor,
        model: device.model
      },
      location: {
        country: geo.country || null,
        countryCode: geo.country || null,
        region: geo.region || null,
        city: geo.city || null,
        latitude: geo.ll?.[0] || null,
        longitude: geo.ll?.[1] || null,
        timezone: geo.timezone || null
      },
      referer: req.headers.referer,
      language: req.headers['accept-language']?.split(',')[0]
    });

    // Update QR code scan count
    await QRCode.findByIdAndUpdate(qrCodeId, {
      $inc: { scanCount: 1 },
      lastScannedAt: new Date()
    });
  } catch (error) {
    console.error('Track scan error:', error);
  }
};

/**
 * @desc    Direct download of QR content file
 * @route   GET /scan/:code/download
 * @access  Public
 */
router.get('/:code/download', async (req, res) => {
  try {
    const { code } = req.params;
    console.log(`[Download] Request for code: ${code}`);

    const qrCode = await QRCode.findOne({ code, isActive: true });

    if (!qrCode) {
      console.log(`[Download] QR Code not found for code: ${code}`);
      return res.status(404).json({ success: false, message: 'QR Code not found' });
    }

    if (!['file', 'document', 'media'].includes(qrCode.type)) {
      console.log(`[Download] Invalid type for download: ${qrCode.type}`);
      return res.status(400).json({ success: false, message: 'This QR type does not support direct download' });
    }

    const content = await Content.findOne({ qrCode: qrCode._id });
    if (!content) {
      console.log(`[Download] Content not found for QR: ${qrCode._id}`);
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const contentObj = content.toObject ? content.toObject() : content;
    console.log(`[Download] Content keys found: ${Object.keys(contentObj).filter(k => contentObj[k] && typeof contentObj[k] === 'object').join(', ')}`);

    // Be extremely flexible about where the file data is stored
    let fileData = null;
    const possibleKeys = [qrCode.type, 'file', 'document', 'media'];

    for (const key of possibleKeys) {
      if (contentObj[key] && (contentObj[key].path || contentObj[key].url)) {
        fileData = contentObj[key];
        console.log(`[Download] Selected fileData from key: ${key}`);
        break;
      }
    }

    if (!fileData) {
      console.log(`[Download] No file data found in any expected key for QR: ${qrCode._id}`);
      return res.status(404).json({ success: false, message: 'File data not found' });
    }

    // Attempt to infer path if missing but URL is present
    if (!fileData.path && fileData.url) {
      console.log(`[Download] Path missing from DB, attempting to infer from URL: ${fileData.url}`);
      try {
        if (fileData.url.includes('/uploads/')) {
          fileData.path = fileData.url.split('/uploads/')[1];
        } else {
          // Try to extract filename as last resort
          const urlParts = fileData.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          // We don't know the full path if we only have the filename and it's not a standard upload
          console.log(`[Download] Could not reliably infer path from external URL: ${fileData.url}`);
        }
      } catch (err) {
        console.error(`[Download] Path inference error: ${err.message}`);
      }
    }

    if (!fileData.path) {
      console.log(`[Download] No file storage path could be determined for QR: ${qrCode._id}`);
      return res.status(404).json({ success: false, message: 'File storage path not found' });
    }

    const fileName = fileData.fileName || 'download';
    const mimeType = fileData.mimeType || 'application/octet-stream';

    console.log(`[Download] Starting download: ${fileName} (${mimeType}) from ${fileData.path}`);

    // Set headers for direct download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    if (fileService.useFtp) {
      // Download from FTP and stream to response
      const client = await fileService.getFtpClient();
      try {
        const remoteRoot = (process.env.FTP_REMOTE_ROOT || 'uploads').replace(/\/$/, '').replace(/^\//, '');
        const remotePath = `${remoteRoot}/${fileData.path.replace(/^\//, '')}`;

        console.log(`[FTP-Download] Streaming: ${remotePath}`);
        await client.downloadTo(res, remotePath);
      } finally {
        client.close();
      }
    } else {
      // Stream local file
      const absolutePath = path.join(fileService.uploadsDir, fileData.path.replace(/^\//, ''));
      if (fs.existsSync(absolutePath)) {
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);
      } else {
        console.log(`[Download] Local file not found at: ${absolutePath}`);
        res.status(404).json({ success: false, message: 'File not found on server' });
      }
    }
  } catch (error) {
    console.error('[Download] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to download file' });
    }
  }
});

/**
 * @desc    Handle QR code scan
 * @route   GET /scan/:code
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const qrCode = await QRCode.findOne({ code, isActive: true });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found or inactive'
      });
    }

    // Check scheduling
    const now = new Date();
    if (qrCode.scheduling) {
      if (qrCode.scheduling.startDate && now < qrCode.scheduling.startDate) {
        return res.status(403).json({
          success: false,
          message: 'This QR code is not yet active'
        });
      }
      if (qrCode.scheduling.endDate && now > qrCode.scheduling.endDate) {
        return res.status(403).json({
          success: false,
          message: 'This QR code has expired'
        });
      }
    }

    // Track scan
    await trackScan(qrCode._id, req);

    // Get content
    const content = await Content.findOne({ qrCode: qrCode._id });

    if (!content) {
      return res.status(404).send('<h1>Content not found</h1>');
    }

    // Determine target URL for redirection
    // Only URL type redirects directly to the destination website
    if (qrCode.type === 'url' && content.url?.target) {
      return res.redirect(content.url.target);
    }

    // For all other dynamic types (vcard, text, file, document, media, etc.), 
    // redirect to the frontend scan UI to provide a rich experience
    return res.redirect(`${process.env.FRONTEND_URL}/qr_app/scan/${code}`);


    // Generate HTML for other content types - REDUNDANT NOW
    // const contentData = content[qrCode.type];

    let html = '';

    if (qrCode.type === 'text') {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${qrCode.title || 'QR Content'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
            h1 { color: #333; margin-top: 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; color: #555; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${qrCode.title || 'Message'}</h1>
            <div class="content">${contentData?.content || 'No content'}</div>
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'vcard') {
      const vc = contentData || {};
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${vc.firstName} ${vc.lastName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
            .header { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
            .avatar { width: 100px; height: 100px; border-radius: 50%; background: white; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; }
            .name { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .title { opacity: 0.9; font-size: 14px; }
            .content { padding: 20px; }
            .field { padding: 15px 0; border-bottom: 1px solid #eee; }
            .field:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #667eea; font-size: 12px; text-transform: uppercase; }
            .value { color: #333; margin-top: 5px; word-break: break-all; }
            a { color: #667eea; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="avatar">${(vc.firstName?.[0] || '') + (vc.lastName?.[0] || '')}</div>
              <div class="name">${vc.firstName || ''} ${vc.lastName || ''}</div>
              ${vc.title ? `<div class="title">${vc.title}</div>` : ''}
              ${vc.organization ? `<div class="title">${vc.organization}</div>` : ''}
            </div>
            <div class="content">
              ${vc.email ? `<div class="field"><div class="label">Email</div><div class="value"><a href="mailto:${vc.email}">${vc.email}</a></div></div>` : ''}
              ${vc.phone ? `<div class="field"><div class="label">Phone</div><div class="value"><a href="tel:${vc.phone}">${vc.phone}</a></div></div>` : ''}
              ${vc.mobile ? `<div class="field"><div class="label">Mobile</div><div class="value"><a href="tel:${vc.mobile}">${vc.mobile}</a></div></div>` : ''}
              ${vc.website ? `<div class="field"><div class="label">Website</div><div class="value"><a href="${vc.website}" target="_blank">${vc.website}</a></div></div>` : ''}
              ${vc.linkedin ? `<div class="field"><div class="label">LinkedIn</div><div class="value"><a href="${vc.linkedin}" target="_blank">${vc.linkedin}</a></div></div>` : ''}
              ${vc.organization ? `<div class="field"><div class="label">Company</div><div class="value">${vc.organization}</div></div>` : ''}
              <div style="padding-top: 25px; text-align: center;">
                <a href="${process.env.BASE_URL}/scan/vcard/${qrCode.code}" 
                   style="display: block; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                   Add to Contacts
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'multilink') {
      const ml = contentData || {};
      const bgColor = ml.backgroundColor || '#f3f4f6';
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${ml.title || 'Links'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${bgColor}; min-height: 100vh; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; }
            .profile { text-align: center; margin-bottom: 30px; background: white; border-radius: 16px; padding: 30px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .avatar { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 15px; object-fit: cover; background: #e0e0e0; }
            .title { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 10px 0 5px; }
            .description { font-size: 14px; color: #666; line-height: 1.5; }
            .links { display: flex; flex-direction: column; gap: 12px; }
            .link { display: block; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .link:active { transform: scale(0.98); }
            .socials { display: flex; justify-content: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
            .social-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: white; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .social-icon:active { transform: scale(0.95); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="profile">
              ${ml.avatar ? `<img src="${ml.avatar}" alt="Avatar" class="avatar">` : ''}
              <h1 class="title">${ml.title || 'My Links'}</h1>
              ${ml.description ? `<p class="description">${ml.description}</p>` : ''}
            </div>
            <div class="links">
              ${(ml.links || []).map(link => `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link" style="background-color: ${link.backgroundColor || '#3b82f6'}; color: ${link.textColor || '#fff'};">
                  ${link.title}
                </a>
              `).join('')}
            </div>
            ${(ml.socialLinks && ml.socialLinks.length > 0) ? `
              <div class="socials">
                ${ml.socialLinks.map(social => `
                  <a href="${social.url}" target="_blank" rel="noopener noreferrer" class="social-icon" title="${social.platform}">
                    ${social.platform.charAt(0).toUpperCase()}
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'email') {
      const em = contentData || {};
      const emailTo = [em.address, em.email, em.to].find(val => val && val !== 'undefined') || '';
      const mailtoLink = `mailto:${emailTo}${em.subject ? '?subject=' + encodeURIComponent(em.subject) : ''}${em.body ? '&body=' + encodeURIComponent(em.body) : ''}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Send Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
            h1 { color: #333; margin: 0 0 20px; }
            .email-icon { font-size: 60px; margin-bottom: 20px; }
            .info { color: #666; margin: 20px 0; font-size: 16px; }
            .button { display: inline-block; margin-top: 30px; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s; }
            .button:active { transform: scale(0.98); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-icon">✉️</div>
            <h1>Send Email</h1>
            <p class="info">To: <strong>${emailTo}</strong></p>
            ${em.subject ? `<p class="info">Subject: <strong>${em.subject}</strong></p>` : ''}
            <a href="${mailtoLink}" class="button">Open Email Client</a>
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'sms') {
      const sm = contentData || {};
      const smsLink = `sms:${sm.phone}${sm.message ? '?body=' + encodeURIComponent(sm.message) : ''}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Send SMS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #34d399 0%, #059669 100%); min-height: 100vh; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
            h1 { color: #333; margin: 0 0 20px; }
            .sms-icon { font-size: 60px; margin-bottom: 20px; }
            .info { color: #666; margin: 20px 0; font-size: 16px; }
            .button { display: inline-block; margin-top: 30px; padding: 15px 40px; background: linear-gradient(135deg, #34d399 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s; }
            .button:active { transform: scale(0.98); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="sms-icon">💬</div>
            <h1>Send SMS</h1>
            <p class="info">Phone: <strong>${sm.phone}</strong></p>
            ${sm.message ? `<p class="info">Message: <strong>${sm.message}</strong></p>` : ''}
            <a href="${smsLink}" class="button">Open Messages</a>
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'wifi') {
      const wifi = contentData || {};
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WiFi Network</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); min-height: 100vh; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
            h1 { color: #333; margin: 0 0 20px; }
            .wifi-icon { font-size: 60px; margin-bottom: 20px; }
            .info { color: #666; margin: 20px 0; font-size: 16px; word-break: break-all; }
            .label { font-weight: 600; color: #0891b2; }
            .button { display: inline-block; margin-top: 30px; padding: 15px 40px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s; }
            .button:active { transform: scale(0.98); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="wifi-icon">📶</div>
            <h1>WiFi Network</h1>
            <p class="info"><span class="label">Network:</span> ${wifi.ssid}</p>
            <p class="info"><span class="label">Security:</span> ${wifi.encryption || 'WPA'}</p>
            ${wifi.hidden ? '<p class="info"><span class="label">Hidden Network</span></p>' : ''}
            <p style="font-size: 12px; color: #999; margin-top: 20px;">To connect: Open WiFi settings on your device and select "${wifi.ssid}"</p>
          </div>
        </body>
        </html>
      `;
    } else if (qrCode.type === 'location') {
      const loc = contentData || {};
      const addressQuery = [loc.address, loc.postalCode].filter(Boolean).join(' ');
      const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(addressQuery)}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${loc.name || 'Location'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); min-height: 100vh; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
            h1 { color: #333; margin: 0 0 20px; }
            .location-icon { font-size: 60px; margin-bottom: 20px; }
            .info { color: #666; margin: 10px 0; font-size: 16px; word-break: break-word; }
            .label { font-weight: 600; color: #ea580c; }
            .button { display: inline-block; margin-top: 30px; padding: 15px 40px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s; }
            .button:active { transform: scale(0.98); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="location-icon">📍</div>
            <h1>${loc.name || 'Location'}</h1>
            ${loc.address ? `<p class="info"><span class="label">Address:</span> ${loc.address}</p>` : ''}
            ${loc.postalCode ? `<p class="info"><span class="label">Postal Code:</span> ${loc.postalCode}</p>` : ''}
            <a href="${mapsLink}" target="_blank" class="button">View on Google Maps</a>
          </div>
        </body>
        </html>
      `;
    }

    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Fallback to JSON
    res.status(200).json({
      success: true,
      type: qrCode.type,
      title: qrCode.title,
      data: contentData
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).send('<h1>Error loading content</h1>');
  }
});


/**
 * @desc    Get QR code content for viewer
 * @route   GET /scan/:code/content
 * @access  Public
 */
router.get('/:code/content', async (req, res) => {
  try {
    const { code } = req.params;

    const qrCode = await QRCode.findOne({ code, isActive: true }).select('-user');

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    const content = await Content.findOne({ qrCode: qrCode._id });

    res.status(200).json({
      success: true,
      qrCode: {
        title: qrCode.title,
        description: qrCode.description,
        type: qrCode.type
      },
      content: content ? content[qrCode.type] : null
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred'
    });
  }
});

/**
 * @desc    Serve VCard file
 * @route   GET /api/public/vcard/:code
 */
router.get('/vcard/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const qrCode = await QRCode.findOne({ code, type: 'vcard' });
    if (!qrCode) return res.status(404).send('Not found');

    const content = await Content.findOne({ qrCode: qrCode._id });
    if (!content || !content.vcard) return res.status(404).send('No contact info');

    const vc = content.vcard;
    let vcf = 'BEGIN:VCARD\nVERSION:3.0\n';
    vcf += `FN:${vc.firstName || ''} ${vc.lastName || ''}\n`;
    vcf += `N:${vc.lastName || ''};${vc.firstName || ''};;;\n`;
    if (vc.organization) vcf += `ORG:${vc.organization}\n`;
    if (vc.title) vcf += `TITLE:${vc.title}\n`;
    if (vc.email) vcf += `EMAIL;TYPE=INTERNET:${vc.email}\n`;
    if (vc.phone) vcf += `TEL;TYPE=VOICE:${vc.phone}\n`;
    if (vc.mobile) vcf += `TEL;TYPE=CELL,VOICE:${vc.mobile}\n`;
    if (vc.website) vcf += `URL:${vc.website}\n`;
    if (vc.linkedin) {
      vcf += `X-SOCIALPROFILE;TYPE=linkedin:${vc.linkedin}\n`;
      vcf += `X-LINKEDIN:${vc.linkedin}\n`;
      vcf += `URL;TYPE=WORK:${vc.linkedin}\n`;
    }
    if (vc.address?.street) {
      vcf += `ADR;TYPE=WORK,POSTAL,PARCEL:;;${vc.address.street};${vc.address.city || ''};${vc.address.state || ''};${vc.address.zip || ''};${vc.address.country || ''}\n`;
    }
    vcf += 'END:VCARD';

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `inline; filename="${vc.firstName || 'contact'}.vcf"`);
    res.send(vcf);
  } catch (error) {
    res.status(500).send('Error');
  }
});

/**
 * @desc    Browser reports GPS location for the most recent scan of this QR code
 * @route   POST /scan/:code/location
 * @access  Public
 */
router.post('/:code/location', async (req, res) => {
  try {
    const { code } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) return res.json({ success: false });

    const qrCode = await QRCode.findOne({ code });
    if (!qrCode) return res.json({ success: false });

    // Reverse-geocode using OpenStreetMap Nominatim (free, no key needed)
    let city = null, country = null, countryCode = null;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: { 'User-Agent': 'QRApp/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      city = addr.city || addr.town || addr.village || addr.county || null;
      country = addr.country || null;
      countryCode = addr.country_code?.toUpperCase() || null;
    } catch { /* ignore reverse-geocode failure */ }

    // Patch the most recent scan for this QR that lacks a real location
    await Scan.findOneAndUpdate(
      {
        qrCode: qrCode._id,
        $or: [
          { 'location.country': null },
          { 'location.country': { $exists: false } }
        ]
      },
      {
        $set: {
          'location.latitude': latitude,
          'location.longitude': longitude,
          ...(city && { 'location.city': city }),
          ...(country && { 'location.country': country }),
          ...(countryCode && { 'location.countryCode': countryCode }),
        }
      },
      { sort: { createdAt: -1 } }
    );

    res.json({ success: true, city, country, countryCode });
  } catch (error) {
    console.error('Location update error:', error);
    res.json({ success: false });
  }
});

export default router;