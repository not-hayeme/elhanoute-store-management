const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  wilaya: String,
  city: String,
  registre: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      position: String
    }
  ],
  location: {
    x: Number,
    y: Number
  },
  address: String,
  email: String,
  phone: String
});

module.exports = mongoose.model('Store', storeSchema);
