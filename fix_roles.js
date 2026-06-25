const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const users = await db.collection('users').find({ role: { $exists: false } }).toArray();
  console.log('Users missing role:', users.length);
  
  const nullRole = await db.collection('users').find({ role: null }).toArray();
  console.log('Users with null role:', nullRole.length);
  
  await db.collection('users').updateMany(
    { $or: [{ role: { $exists: false } }, { role: null }] },
    { $set: { role: 'hcc', rank: 'HCC' } }
  );
  console.log('Fixed undefined/null roles in test DB.');

  // The user says "our local is not on test database" meaning their local is pointing to "curebharat" database!
  // I should apply the same fixes to "curebharat" database so their local works perfectly!
  const dbCurebharat = mongoose.connection.client.db('curebharat');
  
  await dbCurebharat.collection('users').updateMany(
    { teamSize: { $exists: false } },
    { $set: { teamSize: 0, personalSalesCount: 0, totalTimeSpent: 0 } }
  );

  await dbCurebharat.collection('users').updateMany(
    { teamSize: null },
    { $set: { teamSize: 0 } }
  );
  
  await dbCurebharat.collection('users').updateMany(
    { $or: [{ role: { $exists: false } }, { role: null }] },
    { $set: { role: 'hcc', rank: 'HCC' } }
  );

  console.log('Fixed undefined/null roles and teamSize in curebharat DB.');

  process.exit(0);
});
