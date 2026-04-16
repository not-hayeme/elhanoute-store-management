const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const whatsAppService = require('../services/whatsAppService');
const router = express.Router();

// Send OTP to phone number
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone number format
    if (!whatsAppService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Find user by phone number
    let user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'Phone number not registered. Please register first.' });
    }

    // Generate OTP
    const otp = whatsAppService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt,
      attempts: 0
    };
    await user.save();

    // Send OTP via WhatsApp
    try {
      await whatsAppService.sendOTP(phone, otp);
      console.log(`OTP sent to ${phone}: ${otp}`);
      res.json({ message: 'OTP sent successfully', expiresIn: '5 minutes' });
    } catch (whatsappError) {
      console.error('WhatsApp sending error:', whatsappError);
      // Clear OTP if sending failed
      user.otp = undefined;
      await user.save();
      res.status(500).json({ error: 'Failed to send OTP via WhatsApp' });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP exists and is valid
    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    // Check if OTP has expired
    if (user.otp.expiresAt < new Date()) {
      // Clear expired OTP
      user.otp = undefined;
      await user.save();
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 3 attempts)
    if (user.otp.attempts >= 3) {
      user.otp = undefined;
      await user.save();
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      user.otp.attempts += 1;
      await user.save();
      const remainingAttempts = 3 - user.otp.attempts;
      return res.status(400).json({
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      });
    }

    // OTP is valid - clear it and mark phone as verified
    user.otp = undefined;
    user.isPhoneVerified = true;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.otp;

    res.json({
      token,
      user: userObj,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with phone number (for new users who want WhatsApp auth)
router.post('/register-phone', async (req, res) => {
  try {
    const { name, lastname, email, phone, dateofbirth } = req.body;

    if (!name || !lastname || !phone) {
      return res.status(400).json({
        error: "Name, lastname, and phone number are required"
      });
    }

    // Validate phone number format
    if (!whatsAppService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check for existing user with same phone
    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
      return res.status(400).json({
        error: "Phone number already registered"
      });
    }

    // Check for existing user with same email (if provided)
    if (email) {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        return res.status(400).json({
          error: "Email already in use"
        });
      }
    }

    // Create user
    const userData = {
      name,
      lastname,
      phone,
      email: email || undefined,
      dateofbirth: dateofbirth || null,
      isPhoneVerified: false
    };

    const user = await User.create(userData);

    // Generate and send OTP
    const otp = whatsAppService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = {
      code: otp,
      expiresAt,
      attempts: 0
    };
    await user.save();

    // Send OTP via WhatsApp
    try {
      await whatsAppService.sendOTP(phone, otp);
      console.log(`Registration OTP sent to ${phone}: ${otp}`);

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.otp;

      res.status(201).json({
        user: userObj,
        message: 'Registration successful. OTP sent to your WhatsApp.',
        expiresIn: '5 minutes'
      });
    } catch (whatsappError) {
      console.error('WhatsApp sending error:', whatsappError);
      // Delete user if WhatsApp sending failed
      await User.findByIdAndDelete(user._id);
      res.status(500).json({ error: 'Failed to send OTP via WhatsApp. Registration cancelled.' });
    }

  } catch (error) {
    console.error('Register phone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new OTP
    const otp = whatsAppService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = {
      code: otp,
      expiresAt,
      attempts: 0
    };
    await user.save();

    // Send OTP via WhatsApp
    try {
      await whatsAppService.sendOTP(phone, otp);
      console.log(`OTP resent to ${phone}: ${otp}`);
      res.json({ message: 'OTP resent successfully', expiresIn: '5 minutes' });
    } catch (whatsappError) {
      console.error('WhatsApp resend error:', whatsappError);
      user.otp = undefined;
      await user.save();
      res.status(500).json({ error: 'Failed to resend OTP via WhatsApp' });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send OTP for password reset
router.post('/send-reset-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone number format
    if (!whatsAppService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'Phone number not registered. Please register first.' });
    }

    // Generate OTP for password reset
    const otp = whatsAppService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt,
      attempts: 0
    };
    await user.save();

    // Send OTP via WhatsApp
    try {
      await whatsAppService.sendOTP(phone, otp);
      console.log(`Password reset OTP sent to ${phone}: ${otp}`);
      res.json({ message: 'Password reset OTP sent successfully', expiresIn: '5 minutes' });
    } catch (whatsappError) {
      console.error('WhatsApp sending error:', whatsappError);
      // Clear OTP if sending failed
      user.otp = undefined;
      await user.save();
      res.status(500).json({ error: 'Failed to send OTP via WhatsApp' });
    }

  } catch (error) {
    console.error('Send reset OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP for password reset (doesn't log in user)
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP exists and is valid
    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    // Check if OTP has expired
    if (user.otp.expiresAt < new Date()) {
      // Clear expired OTP
      user.otp = undefined;
      await user.save();
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 3 attempts)
    if (user.otp.attempts >= 3) {
      user.otp = undefined;
      await user.save();
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      user.otp.attempts += 1;
      await user.save();
      const remainingAttempts = 3 - user.otp.attempts;
      return res.status(400).json({
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      });
    }

    // OTP is valid - clear it but don't log in user
    user.otp = undefined;
    await user.save();

    res.json({
      message: 'OTP verified successfully. You can now reset your password.',
      phone: phone
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password after OTP verification
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    if (!phone || !newPassword) {
      return res.status(400).json({ error: 'Phone number and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find user by phone number
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;