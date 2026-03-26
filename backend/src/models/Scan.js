import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRCode',
    required: true,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  device: {
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    os: String,
    vendor: String,
    model: String
  },
  location: {
    country: String,
    countryCode: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String
  },
  referer: String,
  language: String
}, {
  timestamps: true
});

// Indexes
scanSchema.index({ qrCode: 1, createdAt: -1 });
scanSchema.index({ createdAt: -1 });
scanSchema.index({ 'location.country': 1 });
scanSchema.index({ 'device.type': 1 });

export default mongoose.model('Scan', scanSchema);