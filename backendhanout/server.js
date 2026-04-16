const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Routes
const userRoutes = require('./routes/userRoutes');
const storeRoutes = require('./routes/storeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const roleRoutes = require('./routes/roleRoutes');
const whatsAppAuthRoutes = require('./routes/whatsAppAuthRoutes');
const invitationsRoutes = require('./routes/invitations');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Log every request
app.use((req, res, next) => {
  const now = new Date().toLocaleTimeString();
  console.log(`📩 [${now}] Received ${req.method} request on ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/auth/whatsapp', whatsAppAuthRoutes);
app.use('/api/invitations', invitationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// MongoDB connection
mongoose.connect('mongodb+srv://seratechdz_db_user:ICXGO9ncQ0jEdQfL@cluster0.ppxwjur.mongodb.net/myAppDB?retryWrites=true&w=majority')
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
