# ElHanoute - Store Management System

A comprehensive multi-platform store management solution with mobile, web, and backend components. ElHanoute (حانوت - "Hanout" meaning "shop" in Arabic) helps small to medium businesses manage their inventory, customers, receipts, and staff efficiently.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

ElHanoute is a full-stack store management application designed to streamline daily operations for retail businesses. It provides a unified platform for managing inventory, tracking sales, handling customer relationships, and coordinating staff across multiple stores.

### Key Capabilities

- **Multi-store support**: Manage multiple store locations from a single platform
- **Cross-platform**: Access from mobile (iOS/Android) or web browser
- **Real-time inventory**: Track items, stock levels, and pricing
- **Receipt generation**: Create and manage sales receipts with automatic calculations
- **Customer management**: Maintain customer records and transaction history
- **Role-based access**: Secure permissions system for owners, admins, and workers
- **WhatsApp authentication**: Convenient OTP-based login via WhatsApp

## ✨ Features

### 📦 Inventory Management
- Add, edit, and delete items
- Track stock quantities and pricing
- Barcode scanning support (mobile app)
- Category and product organization

### 🧾 Receipt & Sales
- Create itemized receipts
- Apply discounts
- Track payment status
- Generate unique receipt numbers
- Export and print receipts

### 👥 Customer Management
- Maintain customer database
- Track customer purchase history
- Customer contact information

### 🏪 Store Management
- Multi-store support
- Store location tracking (GPS coordinates)
- Store registration details
- Store-specific settings

### 👤 User & Role Management
- User authentication (email & WhatsApp OTP)
- Role-based permissions (Owner, Admin, Worker)
- Invitation system for adding staff
- Password reset functionality

### 📱 Mobile-First Design
- Native mobile experience with Expo
- Offline capability
- Camera integration for barcode scanning
- Location services

## 📁 Project Structure

```
general-hanout/
│
├── ElHanoute/              # Mobile Application (React Native + Expo)
│   ├── app/                # App screens and navigation
│   │   ├── (tabs)/         # Tab-based navigation screens
│   │   │   ├── add-item.tsx
│   │   │   ├── add-receipt.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── items.tsx
│   │   │   ├── receipts.tsx
│   │   │   ├── store.tsx
│   │   │   ├── users.tsx
│   │   │   ├── roles.tsx
│   │   │   └── profile.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── invite-user.tsx
│   │   ├── join-store.tsx
│   │   └── whatsapp-verify.tsx
│   ├── components/         # Reusable UI components
│   ├── src/
│   │   └── contexts/       # React contexts (Auth, etc.)
│   └── assets/             # Images, fonts, and static files
│
├── hanoute/                # Web Application (React)
│   ├── src/
│   │   ├── pages/          # Page components
│   │   │   ├── Login/
│   │   │   ├── Items/
│   │   │   ├── Receipts/
│   │   │   ├── Customers/
│   │   │   ├── Stores/
│   │   │   ├── Users/
│   │   │   └── Admins/
│   │   ├── components/     # Reusable components
│   │   │   ├── layout/     # Layout components (Sidebar, Topbar)
│   │   │   └── ui/         # UI components (Button, Card)
│   │   └── auth/           # Authentication context and routes
│   └── public/             # Static assets
│
└── backendhanout/          # Backend API (Node.js + Express)
    ├── models/             # MongoDB schemas
    │   ├── User.js
    │   ├── Store.js
    │   ├── Item.js
    │   ├── Receipt.js
    │   ├── Customer.js
    │   ├── Admin.js
    │   ├── Role.js
    │   ├── Invitation.js
    │   └── Image.js
    ├── routes/             # API route handlers
    │   ├── userRoutes.js
    │   ├── storeRoutes.js
    │   ├── itemRoutes.js
    │   ├── receiptRoutes.js
    │   ├── customerRoutes.js
    │   ├── adminRoutes.js
    │   ├── roleRoutes.js
    │   ├── invitations.js
    │   ├── uploadRoutes.js
    │   └── whatsAppAuthRoutes.js
    ├── services/           # Business logic services
    │   └── whatsAppService.js
    ├── uploads/            # File upload directory
    └── server.js           # Express server entry point
```

## 🛠 Technology Stack

### Mobile Application (ElHanoute)
- **Framework**: React Native 0.81.5
- **Navigation**: Expo Router 6.0
- **UI Components**: Expo (Camera, Barcode Scanner, Print)
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **HTTP Client**: Axios

### Web Application (hanoute)
- **Framework**: React 18.3
- **Routing**: React Router DOM 7.9
- **Styling**: CSS/SCSS with Framer Motion animations
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend (backendhanout)
- **Runtime**: Node.js
- **Framework**: Express 5.1
- **Database**: MongoDB (Atlas)
- **ODM**: Mongoose 8.19
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **CORS**: Enabled for cross-origin requests

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB instance)
- Expo CLI (for mobile development)
- npm or yarn package manager

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/general-hanout.git
cd general-hanout
```

#### 2. Backend Setup
```bash
cd backendhanout
npm install

# Update MongoDB connection string in server.js
# Update line with your MongoDB URI:
# mongoose.connect('your-mongodb-connection-string')

npm start
# Server runs on http://localhost:5000
```

#### 3. Mobile App Setup
```bash
cd ElHanoute
npm install

# Update API endpoint in src/api.js if needed
npx expo start

# Options:
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code with Expo Go app on physical device
```

#### 4. Web App Setup
```bash
cd hanoute
npm install

# Update API endpoint in src/api.js if needed
npm start
# Web app runs on http://localhost:3000
```

### Environment Configuration

Create a `.env` file in the `backendhanout` directory (recommended for production):

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
WHATSAPP_API_KEY=your_whatsapp_api_key
```

**Note**: Update `server.js` to use environment variables instead of hardcoded values for security.

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### User Authentication
```
POST /api/users/login          # Email/password login
POST /api/users/signup         # User registration
POST /api/users/request-reset  # Request password reset OTP
POST /api/users/reset-password # Reset password with OTP
```

#### WhatsApp Authentication
```
POST /api/auth/whatsapp/send-otp    # Send OTP via WhatsApp
POST /api/auth/whatsapp/verify-otp  # Verify OTP code
```

### Resource Endpoints

#### Stores
```
GET    /api/stores              # Get all stores
POST   /api/stores              # Create new store
GET    /api/stores/:id          # Get store by ID
PUT    /api/stores/:id          # Update store
DELETE /api/stores/:id          # Delete store
```

#### Items
```
GET    /api/items               # Get all items
POST   /api/items               # Create new item
GET    /api/items/:id           # Get item by ID
PUT    /api/items/:id           # Update item
DELETE /api/items/:id           # Delete item
```

#### Receipts
```
GET    /api/receipts            # Get all receipts
POST   /api/receipts            # Create new receipt
GET    /api/receipts/:id        # Get receipt by ID
PUT    /api/receipts/:id        # Update receipt
DELETE /api/receipts/:id        # Delete receipt
```

#### Customers
```
GET    /api/customers           # Get all customers
POST   /api/customers           # Create new customer
GET    /api/customers/:id       # Get customer by ID
PUT    /api/customers/:id       # Update customer
DELETE /api/customers/:id       # Delete customer
```

#### Users & Roles
```
GET    /api/users               # Get all users
GET    /api/roles               # Get all roles
POST   /api/roles               # Create new role
```

#### Invitations
```
GET    /api/invitations         # Get all invitations
POST   /api/invitations         # Create invitation
PUT    /api/invitations/:id     # Update invitation status
```

### Health Check
```
GET /api/health                 # Server health status
```

## 🗄 Database Schema

### Core Collections

#### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  phone: String,
  role: String,
  storeId: ObjectId,
  createdAt: Date
}
```

#### Stores
```javascript
{
  _id: ObjectId,
  name: String,
  wilaya: String,
  city: String,
  address: String,
  registre: String,
  ownerId: ObjectId,
  workers: [{ userId: ObjectId, position: String }],
  location: { x: Number, y: Number },
  email: String,
  phone: String
}
```

#### Items
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  quantity: Number,
  storeId: ObjectId,
  barcode: String,
  category: String,
  createdAt: Date
}
```

#### Receipts
```javascript
{
  _id: ObjectId,
  receiptNumber: String (unique),
  items: [{ itemId: ObjectId, quantity: Number, price: Number }],
  discount: Number,
  total: Number,
  pricePayed: Number,
  customerId: ObjectId,
  storeId: ObjectId,
  addedBy: ObjectId,
  dateOfAdding: Date,
  lastEditDate: Date
}
```

#### Customers
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  address: String,
  storeId: ObjectId,
  createdAt: Date
}
```

## 🔒 Security Considerations

- **Password Hashing**: All passwords are hashed using bcryptjs before storage
- **JWT Authentication**: Secure token-based authentication for API requests
- **CORS**: Configured to prevent unauthorized cross-origin requests
- **Input Validation**: Implement input validation on all endpoints (recommended)
- **Environment Variables**: Use `.env` files for sensitive configuration (recommended)

**Important**: Before deploying to production:
1. Move MongoDB connection string to environment variables
2. Add rate limiting middleware
3. Implement request validation
4. Enable HTTPS/SSL
5. Add logging and monitoring
6. Implement proper error handling

## 🧪 Testing

```bash
# Backend tests
cd backendhanout
npm test

# Web app tests
cd hanoute
npm test

# Mobile app tests
cd ElHanoute
npm test
```

## 📱 Mobile App Features

- **Barcode Scanning**: Quickly add items by scanning barcodes
- **Offline Mode**: Continue working without internet connection
- **Print Receipts**: Generate and print receipts directly from the app
- **Camera Integration**: Take photos for product images
- **Location Services**: Track store locations on map

## 💻 Web App Features

- **Responsive Design**: Works on desktop, tablet, and mobile browsers
- **Modern UI**: Clean interface with smooth animations (Framer Motion)
- **Dashboard**: Overview of sales, inventory, and customers
- **Data Export**: Export receipts and reports
- **Bulk Operations**: Manage multiple items simultaneously

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use meaningful variable and function names
- Comment complex logic
- Write unit tests for new features

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Expo team for the excellent mobile development framework
- React and React Native communities
- MongoDB Atlas for database hosting
- All contributors and testers

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

## 🗺 Roadmap

- [ ] Add data analytics and reporting
- [ ] Implement real-time notifications
- [ ] Add multi-language support
- [ ] Integrate payment gateways
- [ ] Add cloud backup and sync
- [ ] Implement dark mode
- [ ] Add export to PDF/Excel
- [ ] Mobile app performance optimization

---

**Note**: This is an active project under development. Features and documentation may change.
