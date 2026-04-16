const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  wilaya: { type: String },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }, // <-- added storeId
  dateOfAdding: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Customer', customerSchema);
