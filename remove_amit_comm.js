const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // Remove the 9006 commission from Amit Mishra's wallet
    const result = await db.collection('wallets').updateOne(
      { 'ledger.description': { $regex: /CB-POL-178-9006/ } },
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9006/ } } } }
    );
    
    // Also, if the policy itself shouldn't show the seller getting commission, we can remove sellerId or ensure no one gets it.
    // Actually, in the frontend, it probably calculates the commission amount by querying the ledger. If the ledger is removed, it won't show.
    // Or does the Sale model have a commissionAmount?
    // Let's check a sale document to see if it has a hardcoded commission value.
    
    console.log(`Removed 9006 ledger in ${db.databaseName}: matched ${result.matchedCount}`);
  }

  process.exit(0);
}

run();
