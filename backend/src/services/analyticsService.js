import Scan from '../models/Scan.js';
import QRCode from '../models/QRCode.js';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';

class AnalyticsService {
  
  /**
   * Track a QR code scan
   */
  async trackScan(qrCodeId, req) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Parse user agent
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();
    
    // Get geo location
    const geo = geoip.lookup(ip.replace('::ffff:', '')) || {};
    
    // Determine device type
    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';
    
    // Create scan record
    const scan = await Scan.create({
      qrCode: qrCodeId,
      ipAddress: ip,
      userAgent,
      device: {
        type: deviceType,
        browser: browser.name,
        os: os.name,
        vendor: device.vendor,
        model: device.model
      },
      location: {
        country: geo.country || 'Unknown',
        countryCode: geo.country,
        region: geo.region,
        city: geo.city,
        latitude: geo.ll?.[0],
        longitude: geo.ll?.[1],
        timezone: geo.timezone
      },
      referer: req.headers.referer,
      language: req.headers['accept-language']?.split(',')[0]
    });
    
    // Update QR code scan count
    await QRCode.findByIdAndUpdate(qrCodeId, {
      $inc: { scanCount: 1 },
      lastScannedAt: new Date()
    });
    
    return scan;
  }

  /**
   * Get analytics for a QR code
   */
  async getAnalytics(qrCodeId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const matchStage = { qrCode: qrCodeId };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const [
      totalScans,
      scansByDate,
      scansByCountry,
      scansByDevice,
      scansByBrowser,
      scansByOS,
      recentScans,
      uniqueVisitors
    ] = await Promise.all([
      // Total scans
      Scan.countDocuments(matchStage),
      
      // Scans by date
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } }
      ]),
      
      // Scans by country
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$location.country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { country: '$_id', count: 1, _id: 0 } }
      ]),
      
      // Scans by device type
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$device.type',
            count: { $sum: 1 }
          }
        },
        { $project: { device: '$_id', count: 1, _id: 0 } }
      ]),
      
      // Scans by browser
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$device.browser',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { browser: '$_id', count: 1, _id: 0 } }
      ]),
      
      // Scans by OS
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$device.os',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { os: '$_id', count: 1, _id: 0 } }
      ]),
      
      // Recent scans
      Scan.find(matchStage)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      // Unique visitors (by IP)
      Scan.distinct('ipAddress', matchStage).then(ips => ips.length)
    ]);
    
    return {
      totalScans,
      uniqueVisitors,
      scansByDate,
      scansByCountry,
      scansByDevice,
      scansByBrowser,
      scansByOS,
      recentScans
    };
  }

  /**
   * Get scan statistics for time period
   */
  async getScanStats(qrCodeId, period = '7d') {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    
    const scans = await Scan.countDocuments({
      qrCode: qrCodeId,
      createdAt: { $gte: startDate }
    });
    
    // Get previous period for comparison
    const previousStart = new Date(startDate - (now - startDate));
    const previousScans = await Scan.countDocuments({
      qrCode: qrCodeId,
      createdAt: { $gte: previousStart, $lt: startDate }
    });
    
    const change = previousScans > 0 
      ? ((scans - previousScans) / previousScans * 100).toFixed(1)
      : scans > 0 ? 100 : 0;
    
    return {
      scans,
      previousScans,
      change: parseFloat(change),
      period
    };
  }
}

export default new AnalyticsService();