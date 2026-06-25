const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const karan = await db.collection('users').findOne({ memberId: 'CB-HCC-1004' });
    const hj = await db.collection('users').findOne({ name: 'HJ Finance' });
    
    if (!karan || !hj) continue;

    // 1. Update Sale record to ensure Karan Miyatra is the Seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9013' },
      {
        $set: {
          customerName: 'YAGNIK LALJIBHAI SABHAYA',
          customerMobile: '7575850216',
          customerEmail: 'yagnik.sabhaya4444@gmail.com',
          customerDOB: '17-Aug-94',
          customerState: 'Gujarat',
          customerPAN: 'EZUPS3972N',
          nomineeName: 'SABHAYA LALJIBHAI PARSOTTAMBHAI',
          nomineeRelation: 'Father',
          sellerId: karan._id,
          sellerMemberId: karan.memberId,
          hccId: karan._id,
          hcmId: hj._id,
          hbaId: hj.referrerId,
          commissionProcessed: false
        }
      }
    );
    console.log('Updated Yagnik sale in ' + db.databaseName);

    // 2. Clear old wallets for this policy
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9013/ } } } }
    );
    console.log('Cleared wallets for 9013');
  }
  
  process.exit(0);
}

run();
