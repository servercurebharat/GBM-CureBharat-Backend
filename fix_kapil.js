const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' }); // Amit Mishra
    
    if (!amit) continue;

    // 1. Update Sale record to ensure Amit Mishra is the Seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9014' }, // Kapil Dube's policy
      {
        $set: {
          sellerId: amit._id,
          sellerMemberId: amit.memberId,
          hccId: null, // Since Amit (HCM) is direct seller
          hcmId: amit._id,
          hbaId: null,
          commissionProcessed: false
        }
      }
    );
    console.log('Updated Kapil sale in ' + db.databaseName);

    // 2. Clear old wallets for this policy so we can recalculate clean
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9014/ } } } }
    );
    console.log('Cleared wallets for 9014');
  }
  
  process.exit(0);
}

run();
