import QRCode from '../models/QRCode.js';
import Content from '../models/Content.js';
import qrGeneratorService from '../services/qrGeneratorService.js';
import fileService from '../services/fileService.js';
import { ensureProtocol } from '../utils/helpers.js';

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

    // Process content to ensure protocols for URLs/links
    let processedContent = { ...content };
    if (type === 'url' && processedContent.target) {
      processedContent.target = ensureProtocol(processedContent.target);
    } else if (type === 'vcard' && processedContent) {
      if (processedContent.website) processedContent.website = ensureProtocol(processedContent.website);
      if (processedContent.linkedin) processedContent.linkedin = ensureProtocol(processedContent.linkedin);
    } else if (type === 'multilink' && processedContent) {
      if (processedContent.avatar) processedContent.avatar = ensureProtocol(processedContent.avatar);
      if (Array.isArray(processedContent.links)) {
        processedContent.links = processedContent.links.map(link => ({
          ...link,
          url: ensureProtocol(link.url)
        }));
      }
      if (Array.isArray(processedContent.socialLinks)) {
        processedContent.socialLinks = processedContent.socialLinks.map(social => ({
          ...social,
          url: ensureProtocol(social.url)
        }));
      }
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
      [type]: processedContent
    };

    console.log('Content Data being saved:', JSON.stringify(contentData, null, 2));
    await Content.create(contentData);

    // Generate QR code content string
    let qrContent;
    if (isDynamic) {
      qrContent = `${process.env.BASE_URL}/scan/${qrCode.code}`;
    } else {
      qrContent = qrGeneratorService.generateContentString(type, processedContent);
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
      // 1. Check for logo change to delete old logo file if replaced
      const oldLogoPath = qrCode.customization?.logo?.path;
      const newLogoPath = customization.logo?.path;

      if (oldLogoPath && newLogoPath && oldLogoPath !== newLogoPath) {
        console.log(`[CLEANUP] Checking if old logo is orphaned: ${oldLogoPath}`);
        const otherRef = await QRCode.findOne({ 'customization.logo.path': oldLogoPath });
        if (!otherRef) {
          try {
            await fileService.deleteFile(oldLogoPath);
            console.log(`[CLEANUP] SUCCESS: Deleted orphaned logo file`);
          } catch (e) {
            console.error(`[CLEANUP] ERROR: Failed to delete logo file`, e);
          }
        } else {
          console.log(`[CLEANUP] SKIPPED: Logo still used by QR: ${otherRef._id}`);
        }
      }

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

      // 2. Delete old QR image
      if (qrCode.qrImagePath) {
        try {
          await fileService.deleteFile(qrCode.qrImagePath);
        } catch (e) {
          console.error(`Failed to delete old QR image: ${qrCode.qrImagePath}`, e);
        }
      }

      // Save new QR image
      const savedQR = await qrGeneratorService.saveQRCode(qrBuffer, req.user.id);
      qrCode.qrImageUrl = savedQR.url;
      qrCode.qrImagePath = savedQR.path;
    }

    await qrCode.save();

    // Update content if provided
    if (content) {
      // 3. Delete old content files if replaced (for file/document/media types)
      if (['file', 'document', 'media'].includes(qrCode.type)) {
        const oldContent = await Content.findOne({ qrCode: qrCode._id });
        const oldFilePath = oldContent?.[qrCode.type]?.path;
        const newFilePath = content.path;

        if (oldFilePath && newFilePath && oldFilePath !== newFilePath) {
          // Safety: only delete if NO other QR code uses this old file
          const otherRef = await Content.findOne({ 
            qrCode: { $ne: qrCode._id },
            $or: [
              { 'file.path': oldFilePath },
              { 'document.path': oldFilePath },
              { 'media.path': oldFilePath }
            ]
          });

          if (!otherRef) {
            try {
              console.log(`[UPDATE-CLEANUP] Deleting replaced orphaned file: ${oldFilePath}`);
              await fileService.deleteFile(oldFilePath);
            } catch (e) {
              console.error(`[UPDATE-CLEANUP] Failed to delete old content file: ${oldFilePath}`, e);
            }
          } else {
            console.log(`[UPDATE-CLEANUP] SKIPPED: Old file still shared with QR: ${otherRef.qrCode}`);
          }
        }
      }

      // Process content to ensure protocols for URLs/links
      let processedContent = { ...content };
      if (qrCode.type === 'url' && processedContent.target) {
        processedContent.target = ensureProtocol(processedContent.target);
      } else if (qrCode.type === 'vcard' && processedContent) {
        if (processedContent.website) processedContent.website = ensureProtocol(processedContent.website);
        if (processedContent.linkedin) processedContent.linkedin = ensureProtocol(processedContent.linkedin);
      } else if (qrCode.type === 'multilink' && processedContent) {
        if (processedContent.avatar) processedContent.avatar = ensureProtocol(processedContent.avatar);
        if (Array.isArray(processedContent.links)) {
          processedContent.links = processedContent.links.map(link => ({
            ...link,
            url: ensureProtocol(link.url)
          }));
        }
        if (Array.isArray(processedContent.socialLinks)) {
          processedContent.socialLinks = processedContent.socialLinks.map(social => ({
            ...social,
            url: ensureProtocol(social.url)
          }));
        }
      }

      await Content.findOneAndUpdate(
        { qrCode: qrCode._id },
        { [qrCode.type]: processedContent },
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

    // 1. Delete QR image file
    if (qrCode.qrImagePath) {
      await fileService.deleteFile(qrCode.qrImagePath);
    }

    // 2. Delete logo file if it exists and is NOT used by other QR codes
    if (qrCode.customization?.logo?.path) {
      const logoPath = qrCode.customization.logo.path;
      console.log(`[DELETE] Checking logo references for: ${logoPath}`);
      
      const otherUser = await QRCode.findOne({ 
        _id: { $ne: qrCode._id },
        'customization.logo.path': logoPath 
      });

      if (!otherUser) {
        console.log(`[DELETE] No other references found. Deleting logo...`);
        try {
          await fileService.deleteFile(logoPath);
        } catch (e) {
          console.error(`[DELETE] Failed to delete logo: ${logoPath}`, e);
        }
      } else {
        console.log(`[DELETE] SKIPPED: Logo is shared with QR: ${otherUser._id}`);
      }
    }

    // 3. Delete associated content and files
    const content = await Content.findOne({ qrCode: qrCode._id });
    if (content) {
      // Find file path based on QR type or fallback to checking all potential fields
      const type = qrCode.type;
      let filePath = content[type]?.path;
      const fileUrl = content[type]?.url;

      // Fallback: If path is missing but URL exists, try to infer path from URL
      if (!filePath && fileUrl) {
        console.log(`[RESOURCE-CLEANUP] Path missing, attempting to infer from URL: ${fileUrl}`);
        const uploadMatch = fileUrl.match(/\/uploads\/(.+)$/);
        if (uploadMatch) {
          filePath = uploadMatch[1];
        }
      }

      // Final Check: Look at all resource-heavy fields just in case
      const potentialFiles = [filePath];
      if (!filePath) {
        ['media', 'document', 'file'].forEach(field => {
          if (content[field]?.path) potentialFiles.push(content[field].path);
        });
      }
      
      for (const p of [...new Set(potentialFiles)].filter(Boolean)) {
        // Reference check for shared content files
        const otherFileRef = await Content.findOne({ 
          qrCode: { $ne: qrCode._id },
          $or: [
            { 'file.path': p },
            { 'document.path': p },
            { 'media.path': p }
          ]
        });

        if (!otherFileRef) {
          try {
            console.log(`[RESOURCE-CLEANUP] Deleting orphaned file: ${p}`);
            await fileService.deleteFile(p);
          } catch (e) {
            console.error(`[RESOURCE-CLEANUP] Failed to delete file: ${p}`, e);
          }
        } else {
          console.log(`[RESOURCE-CLEANUP] SKIPPED: File used by QR: ${otherFileRef.qrCode}`);
        }
      }
      
      // Delete content record
      await Content.deleteOne({ qrCode: qrCode._id });
    }

    // 4. Delete QR code record
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
      // 1. Delete QR image file
      if (qrCode.qrImagePath) {
        try {
          await fileService.deleteFile(qrCode.qrImagePath);
        } catch (e) {
          console.error(`Failed to delete file: ${qrCode.qrImagePath}`, e);
        }
      }

      // 2. Delete logo file (if not shared)
      if (qrCode.customization?.logo?.path) {
        const logoPath = qrCode.customization.logo.path;
        const otherRef = await QRCode.findOne({ 
          _id: { $ne: qrCode._id },
          'customization.logo.path': logoPath 
        });

        if (!otherRef) {
          try {
            await fileService.deleteFile(logoPath);
          } catch (e) {
            console.error(`Failed to delete logo during bulk: ${logoPath}`, e);
          }
        }
      }

      // 3. Delete associated content and its files (if not shared)
      const content = await Content.findOne({ qrCode: qrCode._id });
      if (content) {
        const filePath = content[qrCode.type]?.path;
        if (filePath) {
          const typeKey = `${qrCode.type}.path`;
          const otherFileRef = await Content.findOne({ 
            qrCode: { $ne: qrCode._id },
            [typeKey]: filePath 
          });

          if (!otherFileRef) {
            try {
              await fileService.deleteFile(filePath);
            } catch (e) {
              console.error(`Bulk check failed to delete content file: ${filePath}`, e);
            }
          }
        }
        await Content.deleteOne({ qrCode: qrCode._id });
      }
      
      // 4. Delete QR code record
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