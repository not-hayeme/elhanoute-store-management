const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expires: 0 } // TTL index
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  declinedAt: {
    type: Date
  }
});

// Index for efficient queries
invitationSchema.index({ storeId: 1, status: 1 });
invitationSchema.index({ phone: 1, storeId: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);