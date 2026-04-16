const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  lastname: String,
  dateofbirth: Date,
  password: String,
  email: { type: String, unique: true },
  phone: { type: String, sparse: true }, // Phone number for WhatsApp auth (sparse index created automatically)
  image: String,
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  isPhoneVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
