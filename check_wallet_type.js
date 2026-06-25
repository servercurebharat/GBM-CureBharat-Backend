const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const amit = await dbTest.collection('users').findOne({ memberId: 'CB-HCM-1003' });
  const w1 = await dbTest.collection('wallets').findOne({ userId: amit._id });
  const w2 = await dbTest.collection('wallets').findOne({ userId: amit._id.toString() });
  
  if (w1) console.log('w1 found (ObjectId)');
  if (w2) console.log('w2 found (String)');
  
  const firstWallet = await dbTest.collection('wallets').findOne({});
  console.log('Sample wallet userId type:', typeof firstWallet.userId, firstWallet.userId);

  process.exit(0);
}

run();
