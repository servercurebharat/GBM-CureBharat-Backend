const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const vijaySale = await dbTest.collection('sales').findOne({ policyId: 'CB-POL-178-9005' });
  console.log("SALE:");
  console.log(JSON.stringify(vijaySale, null, 2));

  if (vijaySale && vijaySale.sellerId) {
    const vijayUser = await dbTest.collection('users').findOne({ _id: vijaySale.sellerId });
    console.log("\nSELLER USER:");
    console.log(JSON.stringify(vijayUser, null, 2));

    if (vijayUser && vijayUser.referrerId) {
      const nirmishUser = await dbTest.collection('users').findOne({ _id: vijayUser.referrerId });
      console.log("\nREFERRER USER (Should be Nirmish):");
      console.log(JSON.stringify(nirmishUser, null, 2));
    }
  }

  process.exit(0);
}

run();
