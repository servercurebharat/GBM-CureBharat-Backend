const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  const punit = await db.collection('users').findOne({ memberId: 'CB-HBA-1000' });

  // Update Nirmish Acharya Sale to make Punit Sata the seller
  await db.collection('sales').updateOne(
    { customerName: /Nirmish Acharya/i },
    {
      $set: {
        sellerId: punit._id,
        sellerMemberId: punit.memberId
      }
    }
  );

  console.log(`Reassigned Nirmish Acharya's sale to Punit Sata in ${dbName}!`);
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
