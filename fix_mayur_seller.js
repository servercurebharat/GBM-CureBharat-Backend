const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const hj = await db.collection('users').findOne({ name: 'HJ Finance' });
    const mayur = await db.collection('users').findOne({ memberId: 'CB-HCC-1003' });
    if (!hj || !mayur) continue;

    // 1. Update Sale record so HJ Finance is the seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9008' },
      {
        $set: {
          sellerId: hj._id,
          sellerMemberId: hj.memberId,
          hccId: null, // Since an HCM made the sale directly
          hcmId: hj._id,
          hbaId: hj.referrerId, // -
          commissionProcessed: false // Force reprocess
        }
      }
    );
    console.log('Updated Mayur sale sellerId to HJ Finance in ' + db.databaseName);

    // 2. Adjust personal sales counts
    await db.collection('users').updateOne(
      { _id: hj._id },
      { $inc: { personalSalesCount: 1, personalSalesThisMonth: 1 } }
    );
    await db.collection('users').updateOne(
      { _id: mayur._id },
      { $inc: { personalSalesCount: -1, personalSalesThisMonth: -1 } }
    );

    // 3. Clear Mayur Karia's wallet ledger so he doesn't keep the 40% commission
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9008/ } } } }
    );
    console.log('Cleared old commissions for 9008');
  }
  
  process.exit(0);
}

run();
