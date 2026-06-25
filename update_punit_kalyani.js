const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // 1. Update Punit Sata User
  const punit = await db.collection('users').findOneAndUpdate(
    { memberId: 'CB-HBA-1000' },
    { $set: { email: 'satapunit7@gmail.com', mobile: '9978944422' } },
    { returnDocument: 'after' }
  );

  // 2. Update Kalyani Sata Sale AND reassign seller to Punit Sata!
  await db.collection('sales').updateOne(
    { customerName: /Kalyani Sata/i },
    {
      $set: {
        sellerId: punit.value._id,
        sellerMemberId: punit.value.memberId,
        customerMobile: '9978944422',
        customerEmail: 'satapunit7@gmail.com',
        customerState: 'Gujarat',
        customerDOB: '15/09/1979',
        customerPAN: 'BOKPS4118C',
        nomineeName: 'Punit Sata',
        nomineeRelation: 'Husband'
      }
    }
  );

  console.log(`Updated Punit Sata and Kalyani Sata perfectly in ${dbName}!`);
}

mongoose.connect(URI).then(async () => {
  await updateDb('test');
  await updateDb('curebharat');
  process.exit(0);
});
