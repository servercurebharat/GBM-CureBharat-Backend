const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // 1. Update Jaysukhbhai Sonchhatra User
  await db.collection('users').updateOne(
    { memberId: 'CB-HCC-1002' },
    { $set: { email: 'jaysukhsonchhatra@gmail.com', mobile: '7405077077' } }
  );

  // 2. Update Jaysukhbhai Sonchhatra Sale
  await db.collection('sales').updateOne(
    { customerName: /Jaysukhbhai Sonchhatra/i },
    {
      $set: {
        customerMobile: '7405077077',
        customerEmail: 'jaysukhsonchhatra@gmail.com',
        customerState: 'Gujarat',
        customerDOB: '01/06/1964',
        customerPAN: 'AKNPS3588C',
        nomineeName: 'Abhay Sonchhatra',
        nomineeRelation: 'Son'
      }
    }
  );

  console.log(`Updated Jaysukhbhai Sonchhatra perfectly in ${dbName}!`);
}

mongoose.connect(URI).then(async () => {
  try {
    await updateDb('test');
    await updateDb('curebharat');
  } catch(e) {
    console.log(e);
  } finally {
    process.exit(0);
  }
});
