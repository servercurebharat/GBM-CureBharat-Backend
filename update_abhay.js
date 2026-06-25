const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // 1. Update Abhay Sonchhatra User (if he has an account)
  await db.collection('users').updateOne(
    { name: /Abhay Sonchhatra/i },
    { $set: { email: 'jaysukhsonchhatra@gmail.com', mobile: '9727028826' } }
  );

  // 2. Update Abhay Sonchhatra Sale
  await db.collection('sales').updateOne(
    { customerName: /Abhay Sonchhatra/i },
    {
      $set: {
        customerMobile: '9727028826',
        customerEmail: 'jaysukhsonchhatra@gmail.com',
        customerState: 'Gujarat',
        customerDOB: '06/12/1992',
        customerPAN: 'DJEPS9450Q',
        nomineeName: 'Jaysukhbhai Sonchhatra',
        nomineeRelation: 'Father'
      }
    }
  );

  console.log(`Updated Abhay Sonchhatra perfectly in ${dbName}!`);
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
