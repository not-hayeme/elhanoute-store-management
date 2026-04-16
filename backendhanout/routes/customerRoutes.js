const express = require('express');
const Customer = require('../models/Customer');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  const { storeId } = req.query;
  const filter = storeId ? { storeId } : {};
  const customers = await Customer.find(filter).populate('addedBy');
  res.json(customers);
});

// READ ONE
router.get('/:id', async (req, res) => {
  const customer = await Customer.findById(req.params.id).populate('addedBy');
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
