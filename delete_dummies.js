const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const dbTest = mongoose.connection.client.db('test');
  const dbLocal = mongoose.connection.client.db('curebharat');
  
  const namesToDelete = [/^Abhi$/i, /^abhishek$/i, /^Dummy3$/i];
  
  const resultTest = await dbTest.collection('users').deleteMany({ name: { $in: namesToDelete } });
  console.log(`Deleted ${resultTest.deletedCount} dummy users from test database.`);
  
  const resultLocal = await dbLocal.collection('users').deleteMany({ name: { $in: namesToDelete } });
  console.log(`Deleted ${resultLocal.deletedCount} dummy users from curebharat database.`);

  process.exit(0);
});
