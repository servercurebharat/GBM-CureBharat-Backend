const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const amit = await dbLive.collection('users').findOne({ memberId: 'CB-HCM-1003' });
  const wallet = await dbLive.collection('wallets').findOne({ user: amit._id });
  
  console.log('Amit Wallet Ledgers in Live DB:');
  for (let l of wallet.ledger) {
    console.log(`- ${l.description}: ₹${l.amount / 100}`);
  }
  process.exit(0);
}

run();
