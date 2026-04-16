const express = require('express');
const multer = require('multer');
const Image = require('../models/Image');

const router = express.Router();

// Configure multer to store files in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// POST: upload a single image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const image = new Image({
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    await image.save();
    res.status(200).json({ message: 'Image uploaded successfully', image });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload image', details: err.message });
  }
});

// GET: get all uploaded images
router.get('/images', async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
