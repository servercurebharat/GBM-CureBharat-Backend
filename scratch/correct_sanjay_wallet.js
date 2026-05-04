const mongoose = require('mongoose');
require('dotenv').config();

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
    const correctAmount = 27113; // ₹271.13

    const result = await Wallet.updateOne(
      { user: new mongoose.Types.ObjectId(sanjay) },
      { 
        $set: { 
          provisionalBalance: correctAmount, 
          totalEarned: correctAmount,
          "ledger.0.amount": correctAmount,
          "ledger.0.description": "HBA Override from Priya Desai (HCM) - Policy CB-POL-REAL-001"
        } 
      }
    );

    console.log('Update Result:', result);
    console.log('Sanjay Mehta Wallet corrected to ₹271.13.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
