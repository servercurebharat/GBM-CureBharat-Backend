const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const admins = await dbTest.collection('users').find({ role: 'admin' }).toArray();
  console.log('Admins found:', admins.length);
  for (const a of admins) {
    console.log(`- ${a.name} (${a.email}) | KYC: ${a.kycStatus}`);
  }

  process.exit(0);
}

run();
