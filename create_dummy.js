const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = "mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0";

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));

async function createDummy() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB");

    await User.deleteMany({ mobile: '9999999999' });

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const newUser = new User({
      name: 'Dummy HCC',
      mobile: '9999999999',
      email: 'dummyhcc@example.com',
      password: password,
      role: 'hcc',
      rank: 'HCC',
      memberId: 'CB-HCC-DUMMY',
      status: 'active',
      state: 'Maharashtra',
      kycStatus: 'approved',
      joiningDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      personalSalesCount: 0,
      personalSalesThisMonth: 0,
      personalRecruitsThisMonth: 0,
      teamSize: 0,
      totalTimeSpent: 0
    });

    const savedUser = await newUser.save();
    console.log("Created dummy user:", savedUser.memberId, savedUser.role);

    const newWallet = new Wallet({
      user: savedUser._id,
      finalBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      ledger: []
    });
    await newWallet.save();
    console.log("Created wallet for dummy user");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createDummy();
