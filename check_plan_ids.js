const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const sales = await dbLive.collection('sales').find({ sellerId: new mongoose.Types.ObjectId('6a3bd7d6286cb84c196874e0') }).toArray();
  for (let s of sales) {
     console.log(`Policy: ${s.policyId} | Plan ID: ${s.plan}`);
  }
  
  process.exit(0);
}

run();
