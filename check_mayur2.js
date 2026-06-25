const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const mayur = await dbTest.collection('users').findOne({ memberId: 'CB-HCC-1003' });
  const wallet = await dbTest.collection('wallets').findOne({ user: mayur._id });
  
  console.log("Mayur Ledger for 9008:");
  console.log(JSON.stringify(wallet.ledger.filter(l => l.description.includes('9008')), null, 2));

  process.exit(0);
}

run();
