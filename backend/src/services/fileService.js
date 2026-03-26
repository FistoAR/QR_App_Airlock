import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileService {
  constructor() {
    // Base uploads directory
    this.uploadsDir = path.join(__dirname, '../../uploads');
  }

  /**
   * Getter for FTP toggle to ensure environment variables are loaded
   */
  get useFtp() {
    return process.env.USE_FTP === 'true';
  }

  /**
   * Ensure all upload directories exist (Local fallback)
   */
  ensureDirectories() {
    const dirs = [
      'qr-codes',
      'files/images',
      'files/videos',
      'files/documents',
      'files/audio',
      'logos',
    ];

    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    dirs.forEach(dir => {
      const fullPath = path.join(this.uploadsDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * Get file category from mimetype
   */
  getFileCategory(mimetype) {
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'documents';
  }

  /**
   * Get FTP client with connection
   */
  async getFtpClient() {
    const client = new ftp.Client();
    client.ftp.verbose = process.env.NODE_ENV === 'development';
    try {
      console.log(`[FTP] Connecting to: ${process.env.FTP_HOST} as ${process.env.FTP_USER}`);
      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false, // Set to true if your server supports FTPS
        timeout: 30000
      });
      console.log(`[FTP] Connected successfully`);
      return client;
    } catch (err) {
      console.error(`[FTP] Connection Failed: ${err.message}`);
      client.close();
      throw new Error(`FTP Connection failed: ${err.message}`);
    }
  }

  /**
   * Upload file and return metadata
   */
  async uploadFile(file, options = {}) {
    const { folder = 'files', userId = 'general' } = options;
    const fileCategory = this.getFileCategory(file.mimetype);
    
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    
    // Process file
    let buffer = file.buffer;
    let finalMimeType = file.mimetype;
    let metadata = {};

    if (fileCategory === 'images') {
      if (file.mimetype === 'image/gif') {
        finalMimeType = 'image/gif';
        try {
          const image = sharp(buffer);
          const meta = await image.metadata();
          metadata = { width: meta.width, height: meta.height, format: 'gif' };
        } catch(e) { metadata = {}; }
      } else {
        const result = await this.processImage(buffer);
        buffer = result.buffer;
        finalMimeType = 'image/webp';
        metadata = result.metadata;
      }
    }

    const relativePath = `${folder}/${userId}/${fileCategory}/${fileName}`;

    if (this.useFtp) {
      const client = await this.getFtpClient();
      try {
        // Normalize remote root path
        const remoteRoot = (process.env.FTP_REMOTE_ROOT || 'uploads').replace(/\/$/, '').replace(/^\//, '');
        const remoteDir = `${remoteRoot}/${folder}/${userId}/${fileCategory}`;
        
        console.log(`[FTP] Working Directory: ${remoteDir}`);
        
        // Ensure remote directory structure exists
        await client.ensureDir(remoteDir);
        
        // Upload from buffer
        console.log(`[FTP] Uploading: ${fileName}`);
        const stream = Readable.from(buffer);
        await client.uploadFrom(stream, fileName);
        console.log(`[FTP] Transfer successful`);
        
        const storageUrl = (process.env.EXTERNAL_STORAGE_URL || 'http://airlockintl.co.in/qr_app/uploads').replace(/\/$/, '');
        
        return {
          url: `${storageUrl}/${relativePath}`,
          path: relativePath,
          fileName: file.originalname,
          storedFileName: fileName,
          fileSize: buffer.length,
          mimeType: finalMimeType,
          fileType: fileCategory.slice(0, -1),
          width: metadata.width,
          height: metadata.height,
          uploadedAt: new Date(),
          isExternal: true
        };
      } catch (err) {
        console.error(`[FTP] Upload Error: ${err.message}`);
        throw err;
      } finally {
        client.close();
      }
    } else {
      // Lazy ensure local directories exist
      this.ensureDirectories();

      // Local storage logic
      const userDir = path.join(this.uploadsDir, folder, userId, fileCategory);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      const filePath = path.join(userDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      const stats = fs.statSync(filePath);

      return {
        url: `/uploads/${relativePath}`,
        path: relativePath,
        fileName: file.originalname,
        storedFileName: fileName,
        fileSize: stats.size,
        mimeType: finalMimeType,
        fileType: fileCategory.slice(0, -1),
        width: metadata.width,
        height: metadata.height,
        uploadedAt: new Date(),
        isExternal: false
      };
    }
  }

  /**
   * Process and optimize images
   */
  async processImage(buffer) {
    let image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if too large
    if (metadata.width > 2000 || metadata.height > 2000) {
      image = image.resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for better compression
    const processedBuffer = await image
      .webp({ quality: 85 })
      .toBuffer();

    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      metadata: {
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: 'webp',
      },
    };
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath) {
    if (!filePath) return;

    if (this.useFtp) {
      const client = await this.getFtpClient();
      try {
        const remoteRoot = (process.env.FTP_REMOTE_ROOT || 'uploads').replace(/\/$/, '').replace(/^\//, '');
        const remotePath = `${remoteRoot}/${filePath}`;
        console.log(`[FTP] Deleting: ${remotePath}`);
        await client.remove(remotePath);
      } catch (error) {
        console.error(`[FTP] Delete Error: ${error.message}`);
      } finally {
        client.close();
      }
    } else {
      const fullPath = path.join(this.uploadsDir, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`Deleted local file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to delete local file: ${filePath}`, error);
        }
      }
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    if (this.useFtp) {
      const client = await this.getFtpClient();
      try {
        const remoteRoot = (process.env.FTP_REMOTE_ROOT || 'uploads').replace(/\/$/, '').replace(/^\//, '');
        const remotePath = `${remoteRoot}/${filePath}`;
        const list = await client.list(path.posix.dirname(remotePath));
        return list.some(item => item.name === path.posix.basename(remotePath));
      } catch (err) {
        console.error(`[FTP] Check Error: ${err.message}`);
        return false;
      } finally {
        client.close();
      }
    } else {
      const fullPath = path.join(this.uploadsDir, filePath);
      return fs.existsSync(fullPath);
    }
  }

  /**
   * Get full path for a file (Local only)
   */
  getFullPath(filePath) {
    if (this.useFtp) {
      const storageUrl = (process.env.EXTERNAL_STORAGE_URL || 'http://airlockintl.co.in/qr_app/uploads').replace(/\/$/, '');
      return `${storageUrl}/${filePath}`;
    }
    return path.join(this.uploadsDir, filePath);
  }
}

export default new FileService();