const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const nirmish = await db.collection('users').findOne({ memberId: 'CB-HCM-1002' });
    if (!nirmish) continue;

    // 1. Update Sale record so Nirmish is the seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9005' },
      {
        $set: {
          sellerId: nirmish._id,
          sellerMemberId: nirmish.memberId,
          hccId: null, // Since an HCM made the sale directly
          hcmId: nirmish._id,
          hbaId: nirmish.referrerId // Punit Sata
        }
      }
    );
    console.log('Updated Vijay sale sellerId to Nirmish in ' + db.databaseName);

    // 2. We should also give Nirmish credit for the sale in his personal counts
    await db.collection('users').updateOne(
      { _id: nirmish._id },
      { $inc: { personalSalesCount: 1, personalSalesThisMonth: 1 } }
    );
    
    // Decrement from Vijay Makwana since he didn't sell it to himself
    const vijay = await db.collection('users').findOne({ memberId: 'CB-HCC-1001' });
    if (vijay) {
        await db.collection('users').updateOne(
          { _id: vijay._id },
          { $inc: { personalSalesCount: -1, personalSalesThisMonth: -1 } }
        );
    }
  }
  
  process.exit(0);
}

run();
