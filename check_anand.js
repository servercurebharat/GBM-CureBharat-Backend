const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const sale = await dbTest.collection('sales').findOne({ policyId: 'CB-POL-178-9007' });
  console.log("SALE:");
  console.log(JSON.stringify(sale, null, 2));

  if (sale && sale.plan) {
    const plan = await dbTest.collection('plans').findOne({ _id: sale.plan });
    console.log("\nPLAN:");
    console.log(JSON.stringify(plan, null, 2));
  }

  const hjFinance = await dbTest.collection('users').findOne({ name: 'HJ Finance' });
  if (hjFinance) {
    console.log("\nHJ FINANCE USER:");
    console.log(hjFinance.memberId, hjFinance._id);
    const wallet = await dbTest.collection('wallets').findOne({ user: hjFinance._id });
    console.log("\nHJ FINANCE WALLET LEDGER:");
    if (wallet && wallet.ledger) {
      console.log(JSON.stringify(wallet.ledger.filter(l => l.description.includes('9007')), null, 2));
    } else {
      console.log("No wallet or ledger");
    }
  }

  process.exit(0);
}

run();
