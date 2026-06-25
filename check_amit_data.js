const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const amit = await dbTest.collection('users').findOne({ memberId: 'CB-HCM-1003' });
  const wallet = await dbTest.collection('wallets').findOne({ user: amit._id });
  
  console.log('Amit Wallet Ledgers:');
  for (let l of wallet.ledger) {
    console.log(`- ${l.description}: ₹${l.amount / 100} (${l.type})`);
  }
  
  // Also check Sales where sellerId is Amit
  const sales = await dbTest.collection('sales').find({ sellerId: amit._id.toString() }).toArray();
  console.log(`\nAmit Sales:`);
  let sum = 0;
  for (let s of sales) {
    console.log(`- Policy ${s.policyId}: Amount ${s.saleAmount}, Comm: ${s.commissionProcessed}`);
    sum += (s.saleAmount / 100);
  }

  process.exit(0);
}

run();
