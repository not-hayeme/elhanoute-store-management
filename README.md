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

Full-stack store management system for retail businesses. Unified platform for inventory, sales, customers, and staff across multiple locations.

### ✨ Key Features

- 🏪 **Multi-store** - Manage multiple locations
- 📱💻 **Cross-platform** - iOS, Android, Web
- 📦 **Inventory** - Real-time stock tracking
- 🧾 **Receipts** - Auto-calculated sales
- 👥 **Customers** - Transaction history
- 🔐 **Role-based** - Secure permissions
- 💬 **WhatsApp OTP** - Easy authentication

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

#### 1️⃣ Clone Repository
```bash
git clone https://github.com/not-hayeme/elhanoute-store-management.git
cd elhanoute-store-management
```

#### 2️⃣ Backend Setup ⚙️
```bash
cd backendhanout
npm install
npm start  # 🚀 http://localhost:5000
```

#### 3️⃣ Mobile App 📱
```bash
cd ElHanoute
npm install
npx expo start  # Press 'a' for Android, 'i' for iOS
```

#### 4️⃣ Web App 💻
```bash
cd hanoute
npm install
npm start  # 🌐 http://localhost:3000
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

## 🔒 Security

✅ **Password Hashing** - bcryptjs  
✅ **JWT Auth** - Token-based  
✅ **CORS** - Configured  
⚠️ **Input Validation** - Recommended  
⚠️ **Environment Variables** - Use `.env`  

**Before Production:**
1. 🔐 Move DB credentials to `.env`
2. ⏱️ Add rate limiting
3. ✔️ Request validation
4. 🔒 Enable HTTPS/SSL
5. 📊 Add monitoring

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

## 📱 Mobile Features

📷 Barcode scanning  
🔌 Offline mode  
🖨️ Print receipts  
📸 Camera integration  
📍 Location services  

## 💻 Web Features

📐 Responsive design  
✨ Smooth animations  
📊 Dashboard analytics  
📤 Data export  
⚡ Bulk operations

## 🤝 Contributing

1. 🍴 Fork the repo
2. 🌿 Create branch (`git checkout -b feature/Feature`)
3. 💾 Commit (`git commit -m 'Add Feature'`)
4. 🚀 Push (`git push origin feature/Feature`)
5. 🔀 Open Pull Request

**Code Style:**
✅ Follow ESLint  
✅ Meaningful names  
✅ Comment complex logic  
✅ Write tests

## 📄 License

ISC License

## 👤 Author

**Hayeme** - [@not-hayeme](https://github.com/not-hayeme)

## 🙏 Thanks

💚 Expo Team  
⚛️ React Community  
🍃 MongoDB Atlas  

## 💬 Support

📧 Create an issue or PR

## 🗺 Roadmap

📊 Analytics & reporting  
🔔 Real-time notifications  
🌍 Multi-language  
💳 Payment gateways  
☁️ Cloud sync  
🌙 Dark mode  
📑 PDF/Excel export  
⚡ Performance optimization  

---

⚠️ **Active Development** - Features may change
