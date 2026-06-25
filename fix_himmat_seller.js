const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const hj = await db.collection('users').findOne({ name: 'HJ Finance' });
    const karan = await db.collection('users').findOne({ memberId: 'CB-HCC-1004' });
    if (!hj || !karan) continue;

    // 1. Update Sale record so HJ Finance is the seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9009' },
      {
        $set: {
          sellerId: hj._id,
          sellerMemberId: hj.memberId,
          hccId: null, // Since an HCM made the sale directly
          hcmId: hj._id,
          hbaId: hj.referrerId,
          commissionProcessed: false // Force reprocess
        }
      }
    );
    console.log('Updated Himmatbhai sale sellerId to HJ Finance in ' + db.databaseName);

    // 2. Clear Karan Miyatra's wallet ledger so he doesn't keep the 800 commission
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9009/ } } } }
    );
    console.log('Cleared old commissions for 9009');
  }
  
  process.exit(0);
}

run();
