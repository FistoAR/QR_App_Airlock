import Scan from '../models/Scan.js';
import QRCode from '../models/QRCode.js';

/**
 * @desc    Get analytics for QR code
 * @route   GET /api/analytics/:qrCodeId
 * @access  Private
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { qrCodeId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify ownership
    const qrCode = await QRCode.findOne({
      _id: qrCodeId,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Build match query
    const matchQuery = { qrCode: qrCode._id };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Get analytics data
    const [
      totalScans,
      scansByDate,
      scansByCountry,
      scansByDevice,
      scansByBrowser,
      recentScans
    ] = await Promise.all([
      // Total scans
      Scan.countDocuments(matchQuery),

      // Scans by date
      Scan.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } }
      ]),

      // Scans by country
      Scan.aggregate([
        { $match: matchQuery },
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
        { $match: matchQuery },
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
        { $match: matchQuery },
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

      // Recent scans
      Scan.find(matchQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalScans,
        scansByDate,
        scansByCountry,
        scansByDevice,
        scansByBrowser,
        recentScans
      }
    });
  } catch (error) {
    console.error('Get Analytics Error:', error);
    next(error);
  }
};

/**
 * @desc    Get scan statistics
 * @route   GET /api/analytics/:qrCodeId/stats
 * @access  Private
 */
export const getScanStats = async (req, res, next) => {
  try {
    const { qrCodeId } = req.params;
    const { period = '7d' } = req.query;

    // Verify ownership
    const qrCode = await QRCode.findOne({
      _id: qrCodeId,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Calculate date range
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
      qrCode: qrCode._id,
      createdAt: { $gte: startDate }
    });

    // Get previous period for comparison
    const previousStart = new Date(startDate - (now - startDate));
    const previousScans = await Scan.countDocuments({
      qrCode: qrCode._id,
      createdAt: { $gte: previousStart, $lt: startDate }
    });

    const change = previousScans > 0
      ? ((scans - previousScans) / previousScans * 100).toFixed(1)
      : scans > 0 ? 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        scans,
        previousScans,
        change: parseFloat(change),
        period
      }
    });
  } catch (error) {
    console.error('Get Scan Stats Error:', error);
    next(error);
  }
};

/**
 * @desc    Get dashboard overview
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
export const getDashboard = async (req, res, next) => {
  try {
    // Get all QR codes for user
    const qrCodes = await QRCode.find({ user: req.user.id }).lean();
    const qrCodeIds = qrCodes.map(qr => qr._id);

    const totalQRCodes = qrCodes.length;
    const activeQRCodes = qrCodes.filter(qr => qr.isActive).length;
    const totalScans = qrCodes.reduce((sum, qr) => sum + (qr.scanCount || 0), 0);

    // Get scans for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentScansData, recentScans, lastScansByQR, topLocations] = await Promise.all([
      // Scans grouped by date for chart
      Scan.aggregate([
        {
          $match: {
            qrCode: { $in: qrCodeIds },
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Recent scans with location for the feed
      Scan.find({ qrCode: { $in: qrCodeIds } })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('qrCode', 'title type')
        .lean(),

      // Last scan location per QR code (for card badges)
      Scan.aggregate([
        { $match: { qrCode: { $in: qrCodeIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$qrCode',
            lastCity: { $first: '$location.city' },
            lastCountry: { $first: '$location.country' },
            lastCountryCode: { $first: '$location.countryCode' },
            lastScannedAt: { $first: '$createdAt' }
          }
        }
      ]),

      // Top countries across all QRs (for analytics dashboard)
      Scan.aggregate([
        { $match: { qrCode: { $in: qrCodeIds }, 'location.country': { $nin: [null, 'Unknown', undefined] } } },
        {
          $group: {
            _id: '$location.country',
            countryCode: { $first: '$location.countryCode' },
            count: { $sum: 1 },
            cities: { $addToSet: '$location.city' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Build a map of qrId -> lastLocation for easy lookup (with safe defaults)
    const locationByQR = {};
    lastScansByQR.forEach(s => {
      const city = s.lastCity && s.lastCity !== 'Unknown' ? s.lastCity : null;
      const country = s.lastCountry && s.lastCountry !== 'Unknown' ? s.lastCountry : null;
      const countryCode = s.lastCountryCode && s.lastCountryCode.length === 2 ? s.lastCountryCode : null;
      if (city || country) {
        locationByQR[s._id.toString()] = {
          city,
          country,
          countryCode,
          at: s.lastScannedAt
        };
      }
    });

    // Top performing QR codes with last scan location
    const topQRCodes = [...qrCodes]
      .sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))
      .slice(0, 5)
      .map(qr => ({
        _id: qr._id,
        title: qr.title,
        scanCount: qr.scanCount || 0,
        type: qr.type,
        lastScanLocation: locationByQR[qr._id.toString()] || null
      }));

    // Location map for all QR cards
    const qrLocationMap = Object.fromEntries(
      Object.entries(locationByQR).map(([id, loc]) => [id, loc])
    );

    res.status(200).json({
      success: true,
      data: {
        totalQRCodes,
        activeQRCodes,
        totalScans,
        recentScansData,
        topQRCodes,
        recentScans,
        qrLocationMap,
        topLocations: topLocations.map(l => ({
          country: l._id,
          countryCode: l.countryCode && l.countryCode.length === 2 ? l.countryCode : null,
          count: l.count,
          cities: (l.cities || []).filter(c => c && c !== 'Unknown').slice(0, 3)
        }))
      }
    });
  } catch (error) {
    console.error('Get Dashboard Error:', error);
    next(error);
  }
};

/**
 * @desc    Get all scan locations for a specific QR code
 * @route   GET /api/analytics/:qrCodeId/locations
 * @access  Private
 */
export const getScanLocations = async (req, res, next) => {
  try {
    const { qrCodeId } = req.params;

    const qrCode = await QRCode.findOne({ _id: qrCodeId, user: req.user.id });
    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    const [scans, breakdown] = await Promise.all([
      // Recent scans with location detail (up to 50)
      Scan.find({ qrCode: qrCode._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('location device createdAt')
        .lean(),

      // Country breakdown for this QR
      Scan.aggregate([
        { $match: { qrCode: qrCode._id, 'location.country': { $nin: [null, 'Unknown', undefined] } } },
        {
          $group: {
            _id: '$location.country',
            countryCode: { $first: '$location.countryCode' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Sanitize scans — fill missing fields with null
    const sanitizedScans = scans.map(s => ({
      city: s.location?.city && s.location.city !== 'Unknown' ? s.location.city : null,
      country: s.location?.country && s.location.country !== 'Unknown' ? s.location.country : null,
      countryCode: s.location?.countryCode && s.location.countryCode.length === 2 ? s.location.countryCode : null,
      browser: s.device?.browser || null,
      os: s.device?.os || null,
      deviceType: s.device?.type || 'unknown',
      createdAt: s.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        scans: sanitizedScans,
        breakdown: breakdown.map(b => ({
          country: b._id,
          countryCode: b.countryCode && b.countryCode.length === 2 ? b.countryCode : null,
          count: b.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};