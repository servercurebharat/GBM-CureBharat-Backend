const mongoose = require('mongoose');

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect('mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0');
    console.log('Connected!');

    const Wallet = mongoose.model('Wallet', new mongoose.Schema({ 
      user: mongoose.Schema.Types.ObjectId, 
      provisionalBalance: Number, 
      finalBalance: Number, 
      totalEarned: Number, 
      ledger: Array 
    }));
    
    const sanjay = '69f0ed8cf235856d12ca11b4';
    const amount = 27113; // ₹271.13

    // 1. Wipe and set balances
    await Wallet.updateOne(
      { user: new mongoose.Types.ObjectId(sanjay) },
      { 
        $set: { 
          ledger: [], 
          provisionalBalance: amount, 
          totalEarned: amount 
        } 
      }
    );

    // 2. Push fresh entry
    await Wallet.updateOne(
      { user: new mongoose.Types.ObjectId(sanjay) },
      { 
        $push: { 
          ledger: { 
            amount, 
            type: 'override', 
            description: 'HBA Override from Priya Desai (HCM) - Policy CB-POL-REAL-001', 
            cycleMonth: '2026-05', 
            status: 'provisional', 
            date: new Date() 
          } 
        } 
      }
    );

    console.log('Sanjay Ledger REBUILT with ₹271.13.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
