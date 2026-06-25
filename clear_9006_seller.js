const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  const dbTest = mongoose.connection.client.db('test');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Remove Amit Mishra as the seller for his own policy
    // We just unset sellerId, hcmId, hccId, hbaId so no commissions are paid out for this specific personal policy
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9006' },
      { $unset: { sellerId: "", hcmId: "", hccId: "", hbaId: "" } }
    );
    console.log(`Cleared commissions pipeline for 9006 in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
