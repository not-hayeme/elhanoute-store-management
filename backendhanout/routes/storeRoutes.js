const express = require('express');
const Store = require('../models/Store');
const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.status(201).json(store);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  const stores = await Store.find().populate('ownerId').populate('workers.userId');
  res.json(stores);
});

// READ ONE
router.get('/:id', async (req, res) => {
  const store = await Store.findById(req.params.id).populate('ownerId').populate('workers.userId');
  if (!store) return res.status(404).json({ message: 'Store not found' });
  res.json(store);
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { name, wilaya, city, ownerId } = req.body;
    
    if (!name) return res.status(400).json({ error: "Store name is required" });
    if (!wilaya) return res.status(400).json({ error: "Wilaya is required" });
    if (!city) return res.status(400).json({ error: "City is required" });
    if (!ownerId) return res.status(400).json({ error: "Store owner is required" });
    
    console.log('Updating store:', req.params.id, 'with data:', req.body);
    const updated = await Store.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: "Store not found" });
    }
    
    // Populate owner and workers before returning
    const populatedStore = await Store.findById(updated._id)
      .populate('ownerId')
      .populate('workers.userId');
    
    console.log('Store updated:', populatedStore);
    res.json(populatedStore);
  } catch (err) {
    console.error('Error updating store:', err);
    res.status(400).json({ 
      error: err.message,
      details: err.errors || err
    });
  }
});

// Add worker to store
router.post('/:id/workers', async (req, res) => {
  try {
    const { userId, position } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Check if worker already exists
    if (store.workers.some(w => w.userId.toString() === userId)) {
      return res.status(400).json({ error: "Worker already assigned to this store" });
    }

    // Add new worker
    store.workers.push({ userId, position: position || 'worker' });
    await store.save();

    // Return updated store with populated workers
    const updatedStore = await Store.findById(req.params.id)
      .populate('workers.userId')
      .populate('ownerId');
      
    res.json(updatedStore);
  } catch (err) {
    console.error('Error adding worker:', err);
    res.status(400).json({ error: err.message });
  }
});

// Remove worker from store
router.delete('/:id/workers/:userId', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Remove worker
    store.workers = store.workers.filter(
      w => w.userId.toString() !== req.params.userId
    );
    await store.save();

    // Return updated store with populated workers
    const updatedStore = await Store.findById(req.params.id)
      .populate('workers.userId')
      .populate('ownerId');
      
    res.json(updatedStore);
  } catch (err) {
    console.error('Error removing worker:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update worker position in store
router.put('/:id/workers/:userId', async (req, res) => {
  try {
    const { position } = req.body;
    if (!position) {
      return res.status(400).json({ error: "Position is required" });
    }

    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Find and update worker position
    const workerIndex = store.workers.findIndex(
      w => w.userId.toString() === req.params.userId
    );

    if (workerIndex === -1) {
      return res.status(404).json({ error: "Worker not found in this store" });
    }

    store.workers[workerIndex].position = position;
    await store.save();

    // Return updated store with populated workers
    const updatedStore = await Store.findById(req.params.id)
      .populate('workers.userId')
      .populate('ownerId');
      
    res.json(updatedStore);
  } catch (err) {
    console.error('Error updating worker position:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE store
router.delete('/:id', async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.json({ message: 'Store deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
