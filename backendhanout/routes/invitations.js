const express = require('express');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Store = require('../models/Store');
const router = express.Router();

// Create invitation
router.post('/', async (req, res) => {
  try {
    const { phone, storeId, invitedBy } = req.body;

    if (!phone || !storeId || !invitedBy) {
      return res.status(400).json({ error: 'Phone, storeId, and invitedBy are required' });
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if user already exists with this phone. If they do, ensure they're not already a worker
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      const isAlreadyWorker = store.workers && store.workers.some(w => w.userId && w.userId.toString() === existingUser._id.toString());
      if (isAlreadyWorker) {
        return res.status(400).json({ error: 'User is already a member of this store' });
      }
      // otherwise continue and create invitation — we'll still save invitations for existing users
    }

    // Check if invitation already exists for this phone and store
    const existingInvitation = await Invitation.findOne({
      phone,
      storeId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingInvitation) {
      if (existingInvitation.status === 'accepted') {
        return res.status(400).json({ error: 'User is already a member of this store' });
      }
      return res.status(400).json({ error: 'Invitation already sent to this phone number' });
    }

    // Generate unique token
    const token = `invite_${storeId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const invitation = await Invitation.create({
      token,
      phone,
      storeId,
      invitedBy,
      status: 'pending'
    });

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Get invitations for a store
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status } = req.query;

    const query = { storeId };
    if (status) {
      query.status = status;
    }

    const invitations = await Invitation.find(query)
      .populate('invitedBy', 'name lastname')
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get invitations for a user (pending invitations to accept/decline)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user to get phone number
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invitations = await Invitation.find({
      phone: user.phone,
      status: 'pending'
    })
    .populate('storeId', 'name')
    .populate('invitedBy', 'name lastname')
    .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Accept invitation
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is not pending' });
    }

    // Check if user phone matches invitation phone
    const user = await User.findById(userId);
    if (!user || user.phone !== invitation.phone) {
      return res.status(403).json({ error: 'User not authorized for this invitation' });
    }

    // Add user to store as worker
    const store = await Store.findById(invitation.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if user is already a worker
    const isAlreadyWorker = store.workers.some(worker =>
      worker.userId.toString() === userId
    );

    if (!isAlreadyWorker) {
      store.workers.push({
        userId: userId,
        position: 'Employee',
        roleId: null
      });
      await store.save();
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    res.json({ message: 'Invitation accepted successfully', invitation });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Decline invitation
router.post('/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is not pending' });
    }

    // Check if user phone matches invitation phone
    const user = await User.findById(userId);
    if (!user || user.phone !== invitation.phone) {
      return res.status(403).json({ error: 'User not authorized for this invitation' });
    }

    // Update invitation status
    invitation.status = 'declined';
    invitation.declinedAt = new Date();
    await invitation.save();

    res.json({ message: 'Invitation declined successfully', invitation });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

// Delete invitation (for store owners)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Only allow deletion if invitation is pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot delete non-pending invitations' });
    }

    await Invitation.findByIdAndDelete(id);
    res.json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

// Validate invitation token
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ token })
      .populate('storeId', 'name')
      .populate('invitedBy', 'name lastname');

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        error: 'Invitation is no longer valid',
        status: invitation.status
      });
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json(invitation);
  } catch (error) {
    console.error('Validate invitation error:', error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

module.exports = router;