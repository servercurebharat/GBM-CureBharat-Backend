const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const users = await db.collection('users').find({ $or: [{role: {$exists: false}}, {status: {$exists: false}}, {role: null}, {status: null}] }).toArray();
  console.log('Missing role/status count:', users.length);
  
  for (let u of users) {
    await db.collection('users').updateOne(
      { _id: u._id },
      { $set: { role: u.role || 'hcc', status: u.status || 'active' } }
    );
  }
  
  console.log('Fixed users.');
  process.exit(0);
});
