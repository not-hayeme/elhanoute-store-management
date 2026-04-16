const express = require('express');
const Receipt = require('../models/Receipt');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    const receipt = await Receipt.create(req.body);
    res.status(201).json(receipt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  try {
    let query = {};

    // Filter by storeId if provided
    if (req.query.storeId) {
      query.storeId = req.query.storeId;
    }

    const receipts = await Receipt.find(query)
      .populate('customerId')
      .populate('items.itemId')
      .populate('addedBy');
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  const receipt = await Receipt.findById(req.params.id)
    .populate('customerId')
    .populate('items.itemId')
    .populate('addedBy');
  if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
  res.json(receipt);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Receipt.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Receipt.findByIdAndDelete(req.params.id);
  res.json({ message: 'Receipt deleted' });
});

module.exports = router;
