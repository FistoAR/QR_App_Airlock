import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const qrCodeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  code: {
    type: String,
    unique: true,
    default: () => uuidv4().slice(0, 8),
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['url', 'vcard', 'text', 'file', 'multilink', 'wifi', 'email', 'sms', 'location', 'document', 'media'],
    required: true
  },
  isDynamic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  customization: {
    foregroundColor: {
      type: String,
      default: '#000000'
    },
    backgroundColor: {
      type: String,
      default: '#FFFFFF'
    },
    dotStyle: {
      type: String,
      enum: ['square', 'dots', 'rounded', 'classy', 'classy-rounded', 'extra-rounded'],
      default: 'square'
    },
    cornerStyle: {
      type: String,
      enum: ['square', 'dot', 'extra-rounded'],
      default: 'square'
    },
    cornerDotStyle: {
      type: String,
      enum: ['square', 'dot', 'extra-rounded'],
      default: 'square'
    },
    errorCorrectionLevel: {
      type: String,
      enum: ['L', 'M', 'Q', 'H'],
      default: 'H'
    },

    margin: {
      type: Number,
      default: 4,
      min: 0,
      max: 10
    },
    logo: {
      url: String,
      path: String,
      size: {
        type: Number,
        default: 0.25,
        min: 0.1,
        max: 0.6
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF'
      },
      borderColor: {
        type: String,
        default: '#E2E8F0'
      }
    },
    frame: {
      style: {
        type: String,
        enum: ['none', 'simple', 'rounded', 'banner'],
        default: 'none'
      },
      text: String,
      textColor: {
        type: String,
        default: '#000000'
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF'
      }
    }
  },
  qrImageUrl: String,
  qrImagePath: String,
  shortUrl: String,
  password: {
    isProtected: {
      type: Boolean,
      default: false
    },
    hash: String
  },
  scheduling: {
    startDate: Date,
    endDate: Date,
    timezone: String
  },
 
  scanCount: {
    type: Number,
    default: 0
  },
  lastScannedAt: Date,
  tags: [String],
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }
}, {
  timestamps: true
});

// Indexes
qrCodeSchema.index({ user: 1, createdAt: -1 });
qrCodeSchema.index({ code: 1 });
qrCodeSchema.index({ tags: 1 });

// Virtual for full scan URL
qrCodeSchema.virtual('scanUrl').get(function() {
  return `${process.env.BASE_URL}/scan/${this.code}`;
});

// Pre-save middleware
qrCodeSchema.pre('save', function(next) {
  if (this.isNew && !this.code) {
    this.code = uuidv4().slice(0, 8);
  }
  next();
});

export default mongoose.model('QRCode', qrCodeSchema);