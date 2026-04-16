const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    const { name, lastname, email, password, phone } = req.body;

    if (!name || !lastname) {
      return res.status(400).json({
        error: "Name and lastname are required"
      });
    }

    // Either email or phone must be provided
    if (!email && !phone) {
      return res.status(400).json({
        error: "Either email or phone number is required"
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

    // Check for existing user with same phone (if provided)
    if (phone) {
      const existingPhoneUser = await User.findOne({ phone });
      if (existingPhoneUser) {
        return res.status(400).json({
          error: "Phone number already in use"
        });
      }
    }

    // Prepare user data
    const userData = {
      name,
      lastname,
      dateofbirth: req.body.dateofbirth || null,
      email: email || undefined,
      phone: phone || undefined
    };

    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(password, salt);
    }

    // Handle image if it exists in the request
    if (req.files && req.files.image) {
      userData.image = req.files.image.name;
      // Here you would typically save the file and set the path
    }

    const user = await User.create(userData);

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (err) {
    console.error('User creation error:', err);
    res.status(400).json({
      error: err.message || "Failed to create user"
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Must provide either email or phone
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        message: 'Either email or phone and password are required'
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });

    if (!user) {
      console.log('User not found for login attempt:', { email, phone });
      return res.status(404).json({
        message: 'Account not found with this phone number',
        userExists: false
      });
    }

    const matched = await bcrypt.compare(password, user.password || '');
    if (!matched) {
      console.log('Wrong password for user:', user._id, user.name);
      return res.status(401).json({
        message: 'Incorrect password',
        userExists: true
      });
    }

    console.log('Successful login for user:', user._id, user.name);
    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '7d' }
    );

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ token, user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  try {
    const { phone } = req.query;

    if (phone) {
      // If phone query parameter is provided, find user by phone
      const user = await User.findOne({ phone }).select('-password -otp');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json([user]); // Return as array for consistency
    }

    // Otherwise return all users (without passwords)
    const users = await User.find().select('-password -otp');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const userData = { ...req.body };

    // If updating email, check it's not taken by another user
    if (userData.email) {
      const existingUser = await User.findOne({
        email: userData.email,
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({
          error: "Email already in use by another user"
        });
      }
    }

    // If updating phone, check it's not taken by another user
    if (userData.phone) {
      const existingUser = await User.findOne({
        phone: userData.phone,
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({
          error: "Phone number already in use by another user"
        });
      }
    }

    // Hash new password if provided
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    } else {
      delete userData.password; // Don't update password if not provided
    }

    // Handle image if it exists in the request
    if (req.files && req.files.image) {
      userData.image = req.files.image.name;
      // Here you would typically save the file and set the path
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      userData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const userObj = updated.toObject();
    delete userObj.password;

    res.json(userObj);
  } catch (err) {
    console.error('User update error:', err);
    res.status(400).json({
      error: err.message || "Failed to update user"
    });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
