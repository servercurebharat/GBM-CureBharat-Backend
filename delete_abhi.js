const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const dbTest = mongoose.connection.client.db('test');
  
  // Delete by name or email to be safe
  const result = await dbTest.collection('users').deleteMany({
    $or: [
      { name: /abhishek/i },
      { email: 'webdevwithabhi@gmail.com' },
      { role: 'PATIENT' }
    ]
  });
  
  console.log(`Deleted ${result.deletedCount} stray 'abhishek' / PATIENT users from test database!`);
  process.exit(0);
});
