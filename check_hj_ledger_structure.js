const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const hj = await dbLive.collection('users').findOne({ memberId: 'CB-HCM-1001' });
  const wallet = await dbLive.collection('wallets').findOne({ user: hj._id });
  
  for (let l of wallet.ledger) {
     console.log(`- ${l.description} | amount: ${l.amount} | saleId type: ${typeof l.saleId}, value: ${l.saleId}`);
  }
  
  // Also quickly map the missing 30b plan
  await dbLive.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30b') },
     { $set: { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e43a') } }
  );
  console.log('Mapped 30b plans to Sampoorna Suraksha.');
  
  // And let's check the wallet object to see if totalEarned is set properly
  console.log(`totalEarned: ${wallet.totalEarned}`);

  process.exit(0);
}

run();
