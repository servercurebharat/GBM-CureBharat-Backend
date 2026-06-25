const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const amit = await dbTest.collection('users').findOne({ memberId: 'CB-HCM-1003' });
  const wallet = await dbTest.collection('wallets').findOne({ user: amit._id });
  
  if (wallet && wallet.ledger.length > 0) {
    console.log(`Amit first ledger amount: ${wallet.ledger[0].amount}`);
  }
  
  const sale = await dbTest.collection('sales').findOne({ policyId: 'CB-POL-178-9011' });
  if (sale) {
    console.log(`Sale 9011 BV: ${sale.businessVolume}`);
  }

  process.exit(0);
}

run();
