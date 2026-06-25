const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const users = await db.collection('users').find().toArray();
  
  for (const u of users) {
    let updates = {};
    if (!u.status) updates.status = 'active';
    if (!u.role) updates.role = 'hcc';
    if (!u.rank) updates.rank = 'HCC';
    
    if (Object.keys(updates).length > 0) {
      console.log(`Fixing ${u.name || u._id}... setting:`, updates);
      await db.collection('users').updateOne({ _id: u._id }, { $set: updates });
    }
  }

  console.log('Finished checking and fixing status/role fields!');
  process.exit(0);
});
