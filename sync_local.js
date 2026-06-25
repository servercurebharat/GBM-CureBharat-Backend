const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const dbTest = mongoose.connection.client.db('test');
  const dbLocal = mongoose.connection.client.db('curebharat');
  
  // 1. Fetch all clean, perfectly linked users from test database
  const cleanUsers = await dbTest.collection('users').find().toArray();
  
  // 2. Wipe the local users collection
  await dbLocal.collection('users').deleteMany({});
  
  // 3. Insert the perfect ones
  if (cleanUsers.length > 0) {
    await dbLocal.collection('users').insertMany(cleanUsers);
  }
  
  console.log(`Synced ${cleanUsers.length} perfect users back to your local 'curebharat' database!`);
  process.exit(0);
});
