const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Fetch all sales and map policyId to createdAt
    const sales = await db.collection('sales').find().toArray();
    const dateMap = {};
    for (let s of sales) {
      dateMap[s.policyId] = s.createdAt;
    }

    // 2. Fetch all wallets
    const wallets = await db.collection('wallets').find().toArray();
    let updatedLedgerCount = 0;

    for (let w of wallets) {
      let modified = false;
      const newLedger = w.ledger.map(entry => {
        // Find policyId in description using regex (e.g., CB-POL-178-9001)
        const match = entry.description.match(/(CB-POL-\d+-\d+)/);
        if (match && dateMap[match[1]]) {
          const saleDate = dateMap[match[1]];
          // Only update if the date is different (the dates might already be Date objects or strings, let's just force the Sale Date)
          entry.date = saleDate;
          modified = true;
          updatedLedgerCount++;
        }
        return entry;
      });

      if (modified) {
        await db.collection('wallets').updateOne(
          { _id: w._id },
          { $set: { ledger: newLedger } }
        );
      }
    }
    console.log(`Updated ${updatedLedgerCount} ledger entries in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
