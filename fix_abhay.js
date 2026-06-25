const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const user = await db.collection('users').findOne({ memberId: 'CB-HCC-1009' });
    if (user) {
      await db.collection('wallets').deleteOne({ user: user._id });
      await db.collection('users').deleteOne({ _id: user._id });
      console.log('Deleted Abhay user & wallet from ' + db.databaseName);
    }
    
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9004' },
      { $set: { enrollmentType: 'customer' } }
    );
    console.log('Updated sale in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
