import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRCode',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['url', 'vcard', 'text', 'file', 'multilink', 'wifi', 'email', 'sms', 'location', 'document', 'media'],
    required: true
  },

  // URL Content
  url: {
    target: String,
    title: String,
    description: String,
    favicon: String
  },

  // vCard Content
  vcard: {
    firstName: String,
    lastName: String,
    organization: String,
    title: String,
    email: String,
    phone: String,
    mobile: String,
    fax: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    birthday: Date,
    notes: String,
    photo: String,
    linkedin: String
  },

  // Text Content
  text: {
    content: String
  },

  // File Content
  file: {
    url: String,
    path: String,
    fileName: String,
    storedFileName: String,
    fileSize: Number,
    mimeType: String,
    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'audio', 'other']
    },
    width: Number,
    height: Number,
    uploadedAt: Date
  },

  // Multi-link Content
  multilink: {
    title: String,
    description: String,
    avatar: String,
    backgroundColor: String,
    links: [{
      title: String,
      url: String,
      icon: String,
      backgroundColor: String,
      textColor: String,
      order: Number
    }],
    socialLinks: [{
      platform: String,
      url: String
    }]
  },

  // WiFi Content
  wifi: {
    ssid: String,
    password: String,
    encryption: {
      type: String,
      enum: ['WPA', 'WEP', 'nopass'],
      default: 'WPA'
    },
    hidden: Boolean
  },

  // Email Content
  email: {
    address: String,
    subject: String,
    body: String
  },

  // SMS Content
  sms: {
    phone: String,
    message: String
  },

  // Location Content
  location: {
    latitude: Number,
    longitude: Number,
    name: String,
    address: String,
    postalCode: String
  },
 
  // Document Content
  document: {
    url: String,
    path: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    fileType: String,
    description: String
  },
 
  // Media Content
  media: {
    url: String,
    path: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    fileType: String,
    description: String
  }
 
}, {
  timestamps: true
});

// Index
contentSchema.index({ qrCode: 1 });

export default mongoose.model('Content', contentSchema);