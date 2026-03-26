import QRCode from '../models/QRCode.js';
import Content from '../models/Content.js';
import qrGeneratorService from '../services/qrGeneratorService.js';
import fileService from '../services/fileService.js';

/**
 * @desc    Create new QR code
 * @route   POST /api/qrcodes
 * @access  Private
 */
export const createQRCode = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      isDynamic = true,
      customization = {},
      content,
      tags = []
    } = req.body;

    console.log('=== QR Code Creation Request ===');
    console.log('Type:', type);
    console.log('Content:', JSON.stringify(content, null, 2));
    console.log('Dynamic:', isDynamic);

    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }

    // Create QR code record
    const qrCode = await QRCode.create({
      user: req.user.id,
      title,
      description,
      type,
      isDynamic,
      customization: {
        foregroundColor: customization.foregroundColor || '#000000',
        backgroundColor: customization.backgroundColor || '#FFFFFF',
        dotStyle: customization.dotStyle || 'square',
        cornerStyle: customization.cornerStyle || 'square',
        cornerDotStyle: customization.cornerDotStyle || 'square',
        errorCorrectionLevel: customization.errorCorrectionLevel || 'H',
        margin: customization.margin || 4,
        logo: customization.logo || {},
        frame: customization.frame || { style: 'none' }
      },

      tags
    });

    // Create content record
    const contentData = {
      qrCode: qrCode._id,
      type,
      [type]: content
    };

    console.log('Content Data being saved:', JSON.stringify(contentData, null, 2));
    await Content.create(contentData);

    // Generate QR code content string
    let qrContent;
    if (isDynamic) {
      qrContent = `${process.env.BASE_URL}/scan/${qrCode.code}`;
    } else {
      qrContent = qrGeneratorService.generateContentString(type, content);
    }

    console.log('QR Content to encode:', qrContent);

    // Generate QR code image
    const qrBuffer = await qrGeneratorService.generateQR(qrContent, qrCode.customization);
    console.log('QR Buffer generated, size:', qrBuffer.length);

    // Save QR code to local storage
    const savedQR = await qrGeneratorService.saveQRCode(qrBuffer, req.user.id);
    console.log('QR Code saved:', savedQR);

    // Update QR code with image URL and path
    qrCode.qrImageUrl = savedQR.url;
    qrCode.qrImagePath = savedQR.path;
    qrCode.shortUrl = `${process.env.BASE_URL}/scan/${qrCode.code}`;
    await qrCode.save();

    console.log('QR Code creation completed:', qrCode._id);

    res.status(201).json({
      success: true,
      data: qrCode
    });
  } catch (error) {
    console.error('Create QR Error:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

/**
 * @desc    Get all QR codes for user
 * @route   GET /api/qrcodes
 * @access  Private
 */
export const getQRCodes = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type, 
      sort = '-createdAt',
      isActive 
    } = req.query;

    const query = { user: req.user.id };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Active filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const total = await QRCode.countDocuments(query);

    const qrCodes = await QRCode.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: qrCodes.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: qrCodes
    });
  } catch (error) {
    console.error('Get QR Codes Error:', error);
    next(error);
  }
};

/**
 * @desc    Get single QR code
 * @route   GET /api/qrcodes/:id
 * @access  Private
 */
export const getQRCode = async (req, res, next) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    }).lean();

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Get associated content
    const content = await Content.findOne({ qrCode: qrCode._id }).lean();

    res.status(200).json({
      success: true,
      data: {
        ...qrCode,
        content: content ? content[qrCode.type] : null
      }
    });
  } catch (error) {
    console.error('Get QR Code Error:', error);
    next(error);
  }
};

/**
 * @desc    Update QR code
 * @route   PUT /api/qrcodes/:id
 * @access  Private
 */
export const updateQRCode = async (req, res, next) => {
  try {
    const { title, description, customization, content, isActive, tags } = req.body;

    let qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Update basic fields
    if (title !== undefined) qrCode.title = title;
    if (description !== undefined) qrCode.description = description;
    if (isActive !== undefined) qrCode.isActive = isActive;
    if (tags !== undefined) qrCode.tags = tags;

    // If customization changed, regenerate QR image
    if (customization) {
      qrCode.customization = { 
        ...qrCode.customization.toObject ? qrCode.customization.toObject() : qrCode.customization, 
        ...customization 
      };

      let qrContent;
      if (qrCode.isDynamic) {
        qrContent = `${process.env.BASE_URL}/scan/${qrCode.code}`;
      } else {
        const contentDoc = await Content.findOne({ qrCode: qrCode._id });
        qrContent = qrGeneratorService.generateContentString(
          qrCode.type,
          contentDoc[qrCode.type]
        );
      }

      const qrBuffer = await qrGeneratorService.generateQR(qrContent, qrCode.customization);

      // Delete old QR image
      if (qrCode.qrImagePath) {
        await fileService.deleteFile(qrCode.qrImagePath);
      }

      // Save new QR image
      const savedQR = await qrGeneratorService.saveQRCode(qrBuffer, req.user.id);
      qrCode.qrImageUrl = savedQR.url;
      qrCode.qrImagePath = savedQR.path;
    }

    await qrCode.save();

    // Update content if provided
    if (content) {
      await Content.findOneAndUpdate(
        { qrCode: qrCode._id },
        { [qrCode.type]: content },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: qrCode
    });
  } catch (error) {
    console.error('Update QR Code Error:', error);
    next(error);
  }
};

/**
 * @desc    Delete QR code
 * @route   DELETE /api/qrcodes/:id
 * @access  Private
 */
export const deleteQRCode = async (req, res, next) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Delete QR image file
    if (qrCode.qrImagePath) {
      await fileService.deleteFile(qrCode.qrImagePath);
    }

    // Delete associated content and files
    const content = await Content.findOne({ qrCode: qrCode._id });
    if (content && content.file && content.file.path) {
      await fileService.deleteFile(content.file.path);
    }

    // Delete content record
    await Content.deleteOne({ qrCode: qrCode._id });

    // Delete QR code record
    await qrCode.deleteOne();

    res.status(200).json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR Code Error:', error);
    next(error);
  }
};

/**
 * @desc    Download QR code image
 * @route   GET /api/qrcodes/:id/download
 * @access  Private
 */
export const downloadQRCode = async (req, res, next) => {
  try {
    const { format = 'png', size = 1000 } = req.query;

    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    let qrContent;
    if (qrCode.isDynamic) {
      qrContent = `${process.env.BASE_URL}/scan/${qrCode.code}`;
    } else {
      const content = await Content.findOne({ qrCode: qrCode._id });
      qrContent = qrGeneratorService.generateContentString(
        qrCode.type, 
        content[qrCode.type]
      );
    }

    const customization = {
      ...qrCode.customization.toObject ? qrCode.customization.toObject() : qrCode.customization,
      width: parseInt(size)
    };

    const qrData = await qrGeneratorService.generateAsFormat(qrContent, customization, format);

    const contentTypes = {
      png: 'image/png',
      svg: 'image/svg+xml',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      webp: 'image/webp'
    };

    // Clean filename
    const cleanTitle = qrCode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    res.setHeader('Content-Type', contentTypes[format] || 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.${format}"`);
    res.send(qrData);
  } catch (error) {
    console.error('Download QR Code Error:', error);
    next(error);
  }
};

/**
 * @desc    Duplicate QR code
 * @route   POST /api/qrcodes/:id/duplicate
 * @access  Private
 */
export const duplicateQRCode = async (req, res, next) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    const content = await Content.findOne({ qrCode: qrCode._id });

    // Create duplicate QR code
    const newQRCode = await QRCode.create({
      user: req.user.id,
      title: req.body.title || `${qrCode.title} (Copy)`,
      description: qrCode.description,
      type: qrCode.type,
      isDynamic: qrCode.isDynamic,
      customization: qrCode.customization,
      tags: qrCode.tags
    });

    // Duplicate content
    if (content) {
      const newContent = {
        qrCode: newQRCode._id,
        type: content.type,
        [content.type]: content[content.type]
      };
      await Content.create(newContent);
    }

    // Generate new QR image
    let qrContentStr;
    if (newQRCode.isDynamic) {
      qrContentStr = `${process.env.BASE_URL}/scan/${newQRCode.code}`;
    } else {
      qrContentStr = qrGeneratorService.generateContentString(
        newQRCode.type, 
        content[content.type]
      );
    }

    const qrBuffer = await qrGeneratorService.generateQR(qrContentStr, newQRCode.customization);
    const savedQR = await qrGeneratorService.saveQRCode(qrBuffer, req.user.id);

    newQRCode.qrImageUrl = savedQR.url;
    newQRCode.qrImagePath = savedQR.path;
    newQRCode.shortUrl = `${process.env.BASE_URL}/scan/${newQRCode.code}`;
    await newQRCode.save();

    res.status(201).json({
      success: true,
      data: newQRCode
    });
  } catch (error) {
    console.error('Duplicate QR Code Error:', error);
    next(error);
  }
};

/**
 * @desc    Delete multiple QR codes
 * @route   POST /api/qrcodes/bulk-delete
 * @access  Private
 */
export const deleteManyQRCodes = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No IDs provided'
      });
    }

    const qrCodes = await QRCode.find({
      _id: { $in: ids },
      user: req.user.id
    });

    for (const qrCode of qrCodes) {
      // Delete QR image file
      if (qrCode.qrImagePath) {
        try {
          await fileService.deleteFile(qrCode.qrImagePath);
        } catch (e) {
          console.error(`Failed to delete file: ${qrCode.qrImagePath}`, e);
        }
      }

      // Delete associated content and files
      const content = await Content.findOne({ qrCode: qrCode._id });
      if (content && content.file && content.file.path) {
        try {
          await fileService.deleteFile(content.file.path);
        } catch (e) {
          console.error(`Failed to delete content file: ${content.file.path}`, e);
        }
      }

      // Delete content record
      await Content.deleteOne({ qrCode: qrCode._id });
      
      // Delete QR code record
      await qrCode.deleteOne();
    }

    res.status(200).json({
      success: true,
      message: `${qrCodes.length} QR codes deleted successfully`
    });
  } catch (error) {
    console.error('Delete Many QR Codes Error:', error);
    next(error);
  }
};