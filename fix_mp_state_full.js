const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    console.log(`\n--- Updating ${db.databaseName} ---`);
    
    // 1. Update User top-level state
    const userRes1 = await db.collection('users').updateMany(
      { state: 'MP' },
      { $set: { state: 'Madhya Pradesh' } }
    );
    console.log(`Users updated (top-level state): ${userRes1.modifiedCount}`);

    // 2. Update User address.state
    const userRes2 = await db.collection('users').updateMany(
      { 'address.state': 'MP' },
      { $set: { 'address.state': 'Madhya Pradesh' } }
    );
    console.log(`Users updated (address.state): ${userRes2.modifiedCount}`);

    // 3. Update Sale customerState
    const saleRes = await db.collection('sales').updateMany(
      { customerState: 'MP' },
      { $set: { customerState: 'Madhya Pradesh' } }
    );
    console.log(`Sales updated (customerState): ${saleRes.modifiedCount}`);
  }

  process.exit(0);
}

run();
