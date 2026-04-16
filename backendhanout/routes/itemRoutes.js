const express = require('express');
const Item = require('../models/Item');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  const { storeId } = req.query;
  const filter = storeId ? { storeId } : {};
  const items = await Item.find(filter).populate('addedBy');
  res.json(items);
});

// READ ONE
router.get('/:id', async (req, res) => {
  const item = await Item.findById(req.params.id).populate('addedBy');
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: 'Item deleted' });
});

module.exports = router;
