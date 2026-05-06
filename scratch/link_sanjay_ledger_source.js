const mongoose = require('mongoose');

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect('mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0');
    console.log('Connected!');

    const Wallet = mongoose.model('Wallet', new mongoose.Schema({ 
      user: mongoose.Schema.Types.ObjectId, 
      ledger: Array 
    }));
    
    const User = mongoose.model('User', new mongoose.Schema({ memberId: String }));
    
    const sanjay = '69f0ed8cf235856d12ca11b4';
    const amit = await User.findOne({ memberId: 'CB-HCC-0001' });
    
    if (!amit) {
      console.error('Amit not found!');
      process.exit(1);
    }

    // Update the first ledger entry with sourceUserId
    const result = await Wallet.updateOne(
      { user: new mongoose.Types.ObjectId(sanjay), "ledger.0": { $exists: true } },
      { 
        $set: { 
          "ledger.0.sourceUserId": amit._id 
        } 
      }
    );

    console.log('Update Result:', result);
    console.log('Sanjay Ledger linked to Amit Kumar for source transparency.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
