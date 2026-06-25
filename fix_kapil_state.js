const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9014' },
      { $set: { customerState: 'Madhya Pradesh' } }
    );
    
    // Also update Kapil Dube's user profile just in case
    await db.collection('users').updateOne(
      { memberId: 'CB-HCC-1008' },
      { $set: { state: 'Madhya Pradesh' } }
    );
    
    console.log(`Updated Kapil Dube's state to Madhya Pradesh in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
