const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const dbTest = mongoose.connection.client.db('test');
  const dbCure = mongoose.connection.client.db('curebharat');
  
  await dbTest.collection('sales').updateMany({}, { $set: { cycleMonth: 'June-2026' } });
  await dbCure.collection('sales').updateMany({}, { $set: { cycleMonth: 'June-2026' } });
  
  console.log('Added cycleMonth to all sales!');
  process.exit(0);
});
