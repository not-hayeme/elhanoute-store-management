const mongoose = require('mongoose');
const User = require('./models/User');

async function cleanupOtpFields() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hanout', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all users who are phone verified but still have otp objects
    const usersWithOtp = await User.find({
      isPhoneVerified: true,
      otp: { $exists: true, $ne: null }
    });

    console.log(`Found ${usersWithOtp.length} users with phone verified but otp objects present`);

    // Clean up otp fields for these users
    const result = await User.updateMany(
      {
        isPhoneVerified: true,
        otp: { $exists: true, $ne: null }
      },
      {
        $unset: { otp: 1 }
      }
    );

    console.log(`Cleaned up ${result.modifiedCount} user records`);

    // Also clean up any expired otps for unverified users
    const expiredOtpResult = await User.updateMany(
      {
        isPhoneVerified: false,
        'otp.expiresAt': { $lt: new Date() }
      },
      {
        $unset: { otp: 1 }
      }
    );

    console.log(`Cleaned up ${expiredOtpResult.modifiedCount} expired OTPs for unverified users`);

    console.log('Database cleanup completed successfully');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupOtpFields();