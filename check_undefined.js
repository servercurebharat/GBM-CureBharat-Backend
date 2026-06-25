const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const users = await db.collection('users').find().toArray();
  
  console.log(`Found ${users.length} users.`);
  
  let issues = 0;
  for (const u of users) {
    let missing = [];
    if (!u.role) missing.push('role');
    if (!u.status) missing.push('status');
    if (!u.rank) missing.push('rank');
    if (typeof u.role !== 'string') missing.push('role (not string)');
    if (typeof u.status !== 'string') missing.push('status (not string)');
    if (typeof u.rank !== 'string') missing.push('rank (not string)');
    
    if (missing.length > 0) {
      console.log(`User ${u.name} (${u._id}) is missing/bad: ${missing.join(', ')}`);
      issues++;
      
      // Auto-fix it!
      const update = {};
      if (missing.includes('role')) update.role = u.role || 'hcc';
      if (missing.includes('status')) update.status = u.status || 'active';
      if (missing.includes('rank')) update.rank = u.rank || 'HCC';
      if (Object.keys(update).length > 0) {
        await db.collection('users').updateOne({ _id: u._id }, { $set: update });
        console.log(`Auto-fixed ${u.name}`);
      }
    }
  }

  if (issues === 0) {
    console.log("No users with missing/bad role, status, or rank found!");
  }
  
  process.exit(0);
});
