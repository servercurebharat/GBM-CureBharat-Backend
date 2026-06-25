const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // 1. Update HJ Finance User
  await db.collection('users').updateOne(
    { memberId: 'CB-HCM-1001' },
    { $set: { email: 'hjfinance14@gmail.com', mobile: '8490818234' } }
  );

  // 2. Update Hirva Jayswal Sale
  await db.collection('sales').updateOne(
    { customerName: /Hirva Jayswal/i },
    {
      $set: {
        customerMobile: '8490818234',
        customerEmail: 'hjfinance14@gmail.com',
        customerState: 'Gujarat',
        customerDOB: '11/07/2002',
        customerPAN: 'CHJPJ9091C',
        nomineeName: 'Manishaben Jayswal',
        nomineeRelation: 'Mother'
      }
    }
  );

  console.log(`Updated HJ Finance and Hirva Jayswal perfectly in ${dbName}!`);
}

mongoose.connect(URI).then(async () => {
  await updateDb('test');
  await updateDb('curebharat');
  process.exit(0);
});
