const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const userTest = await dbTest.collection('users').findOne({ memberId: 'CB-HCM-1001' });
  const userLive = await dbLive.collection('users').findOne({ memberId: 'CB-HCM-1001' });
  
  console.log(`HJ Test ID: ${userTest._id}`);
  console.log(`HJ Live ID: ${userLive._id}`);
  
  // Check sales for HJ Finance in Live DB
  const salesLive = await dbLive.collection('sales').find({ sellerId: userLive._id.toString() }).toArray();
  console.log(`\nHJ Live Sales Count: ${salesLive.length}`);
  for (let s of salesLive) {
     console.log(`- ${s.policyId}: hcmId=${s.hcmId}, sellerId=${s.sellerId}, hccId=${s.hccId}`);
  }
  
  // Check wallet for HJ Finance in Live DB
  const walletLive = await dbLive.collection('wallets').findOne({ user: userLive._id });
  console.log(`\nHJ Live Wallet Ledger Count: ${walletLive.ledger.length}`);

  process.exit(0);
}

run();
