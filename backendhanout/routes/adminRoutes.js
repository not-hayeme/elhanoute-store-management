const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    // Hash password before saving admin
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const admin = await Admin.create(req.body);
    const adminObj = admin.toObject(); delete adminObj.password;
    res.status(201).json(adminObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const matched = await bcrypt.compare(password, admin.password || '');
    if (!matched) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '7d' });
    const adminObj = admin.toObject(); delete adminObj.password;
    res.json({ token, admin: adminObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  const admins = await Admin.find();
  res.json(admins);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Admin.findByIdAndDelete(req.params.id);
  res.json({ message: 'Admin deleted' });
});

module.exports = router;
