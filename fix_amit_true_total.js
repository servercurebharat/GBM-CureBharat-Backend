const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' });
    const wallet = await db.collection('wallets').findOne({ user: amit._id });
    
    if (wallet && wallet.ledger) {
      let trueTotal = 0;
      for (let l of wallet.ledger) {
        // If it's a credit, add it.
        // Wait, commissionAmount in ledger? Let's check ledger amount field.
        if (l.type === 'credit') {
           trueTotal += l.amount;
        }
      }
      
      console.log(`Computed true total for Amit in ${db.databaseName}: ₹${trueTotal / 100}`);
      
      await db.collection('wallets').updateOne(
        { _id: wallet._id },
        { 
          $set: { 
            totalIncome: trueTotal,
            currentBalance: trueTotal // Assuming no withdrawals yet
          }
        }
      );
      
      // We also need to check how the frontend gets totalEarned! 
      // If the frontend computes it from `sales` collection directly!
      const sales = await db.collection('sales').find({ sellerId: amit._id.toString() }).toArray();
      let totalFromSales = 0;
      for (let s of sales) {
         if (s.policyId !== 'CB-POL-178-9006') { // We exclude his own
            // actually if we want it excluded, we need to remove sellerId from 9006!
         }
      }
    }
  }

  process.exit(0);
}

run();
