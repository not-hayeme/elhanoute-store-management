const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      quantity: Number,
      price: Number
    }
  ],
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true }, // <-- added total price
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }, // <-- added storeId
  dateOfAdding: { type: Date, default: Date.now },
  lastEditDate: { type: Date }, // <-- added last edit date
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pricePayed: { type: Number },
  receiptNumber: { type: String, unique: true } // <-- added receipt number
});

module.exports = mongoose.model('Receipt', receiptSchema);
