const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reference: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  unitsPerBox: { type: Number },
  promo: { type: String },
  dateOfAdding: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true } // <--- added field
});


module.exports = mongoose.model('Item', itemSchema);
