const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  dateOfAdding: {
    type: Date,
    default: Date.now
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Permissions/Abilities
  permissions: {
    viewingFullInventory: {
      type: Boolean,
      default: false
    },
    addingItems: {
      type: Boolean,
      default: false
    },
    editingItems: {
      type: Boolean,
      default: false
    },
    deletingItems: {
      type: Boolean,
      default: false
    },
    addingCustomers: {
      type: Boolean,
      default: false
    },
    deletingCustomers: {
      type: Boolean,
      default: false
    },
    editingCustomer: {
      type: Boolean,
      default: false
    },
    assigningUsersFromStore: {
      type: Boolean,
      default: false
    },
    deletingUsersFromStore: {
      type: Boolean,
      default: false
    },
    viewingAllReceipts: {
      type: Boolean,
      default: false
    },
    deletingReceipts: {
      type: Boolean,
      default: false
    },
    editingReceipts: {
      type: Boolean,
      default: false
    }
  }
});

module.exports = mongoose.model('Role', roleSchema);