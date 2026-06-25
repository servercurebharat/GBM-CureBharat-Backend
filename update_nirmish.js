const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // 1. Update Nirmish Acharya User
  await db.collection('users').updateOne(
    { memberId: 'CB-HCM-1002' },
    { $set: { email: 'acharyanirmish@gmail.com', mobile: '9106344869' } }
  );

  // 2. Update Nirmish Acharya Sale
  await db.collection('sales').updateOne(
    { customerName: /Nirmish Acharya/i },
    {
      $set: {
        customerMobile: '9106344869',
        customerEmail: 'acharyanirmish@gmail.com',
        customerState: 'Gujarat',
        customerDOB: '10/11/1969',
        customerPAN: 'ADJPA9927G',
        nomineeName: 'Ajita J Jani',
        nomineeRelation: 'Wife'
      }
    }
  );

  console.log(`Updated Nirmish Acharya perfectly in ${dbName}!`);
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
