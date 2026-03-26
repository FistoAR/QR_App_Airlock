import Content from '../models/Content.js';
import QRCode from '../models/QRCode.js';
import fileService from '../services/fileService.js';
import https from 'https';
import http from 'http';

/**
 * @desc    Upload file for QR code
 * @route   POST /api/content/upload
 * @access  Private
 */
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Upload file to local storage
    const uploadResult = await fileService.uploadFile(req.file, {
      folder: 'files',
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: uploadResult
    });
  } catch (error) {
    console.error('Upload File Error:', error);
    next(error);
  }
};

/**
 * @desc    Update content for QR code
 * @route   PUT /api/content/:qrCodeId
 * @access  Private
 */
export const updateContent = async (req, res, next) => {
  try {
    const { qrCodeId } = req.params;
    const { content } = req.body;

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

    const updatedContent = await Content.findOneAndUpdate(
      { qrCode: qrCodeId },
      { [qrCode.type]: content },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedContent
    });
  } catch (error) {
    console.error('Update Content Error:', error);
    next(error);
  }
};

/**
 * @desc    Get content for QR code
 * @route   GET /api/content/:qrCodeId
 * @access  Private
 */
export const getContent = async (req, res, next) => {
  try {
    const { qrCodeId } = req.params;

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

    const content = await Content.findOne({ qrCode: qrCodeId });

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get Content Error:', error);
    next(error);
  }
};

/**
 * @desc    Delete file from content
 * @route   DELETE /api/content/file
 * @access  Private
 */
export const deleteFile = async (req, res, next) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    await fileService.deleteFile(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete File Error:', error);
    next(error);
  }
};

/**
 * @desc    Proxy image to avoid CORS
 * @route   GET /api/content/proxy
 * @access  Private
 */
export const proxyImage = (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('URL is required');
    }

    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      // Basic validation
      if (response.statusCode >= 400) {
        return res.status(response.statusCode).send('Source image error');
      }
      
      // Set headers from source
      if (response.headers['content-type']) {
        res.set('Content-Type', response.headers['content-type']);
      }
      res.set('Cache-Control', 'public, max-age=86400');
      
      response.pipe(res);
    }).on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(500).send('Communication error with image server');
    });
  } catch (error) {
    console.error('Proxy Image Error:', error);
    res.status(500).send('Internal server error');
  }
};