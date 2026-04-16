const express = require('express');
const Role = require('../models/Role');
const router = express.Router();

// CREATE - Create a new role for a store
router.post('/', async (req, res) => {
  try {
    const { name, storeId, createdBy, permissions } = req.body;

    if (!name) return res.status(400).json({ error: "Role name is required" });
    if (!storeId) return res.status(400).json({ error: "Store ID is required" });
    if (!createdBy) return res.status(400).json({ error: "Creator ID is required" });

    const role = await Role.create({
      name,
      storeId,
      createdBy,
      permissions: permissions || {}
    });

    const populatedRole = await Role.findById(role._id)
      .populate('storeId')
      .populate('users')
      .populate('createdBy');

    res.status(201).json(populatedRole);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL - Get all roles (optionally filter by storeId)
router.get('/', async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = {};

    if (storeId) {
      query.storeId = storeId;
    }

    const roles = await Role.find(query)
      .populate('storeId')
      .populate('users')
      .populate('createdBy')
      .sort({ dateOfAdding: -1 });

    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE - Get a specific role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('storeId')
      .populate('users')
      .populate('createdBy');

    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - Update a role
router.put('/:id', async (req, res) => {
  try {
    const { name, permissions, users } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (permissions) updateData.permissions = permissions;
    if (users) updateData.users = users;

    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('storeId')
    .populate('users')
    .populate('createdBy');

    if (!updatedRole) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json(updatedRole);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE - Delete a role
router.delete('/:id', async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndDelete(req.params.id);

    if (!deletedRole) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD USER TO ROLE
router.post('/:id/users', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });

    // Check if user is already in the role
    if (role.users.includes(userId)) {
      return res.status(400).json({ error: "User is already in this role" });
    }

    role.users.push(userId);
    await role.save();

    const updatedRole = await Role.findById(role._id)
      .populate('storeId')
      .populate('users')
      .populate('createdBy');

    res.json(updatedRole);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// REMOVE USER FROM ROLE
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });

    role.users = role.users.filter(user => user.toString() !== req.params.userId);
    await role.save();

    const updatedRole = await Role.findById(role._id)
      .populate('storeId')
      .populate('users')
      .populate('createdBy');

    res.json(updatedRole);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;