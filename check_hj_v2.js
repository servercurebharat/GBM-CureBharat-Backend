const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const userLive = await dbLive.collection('users').findOne({ memberId: 'CB-HCM-1001' });
  
  const salesLive = await dbLive.collection('sales').find({ sellerId: userLive._id }).toArray();
  console.log(`\nHJ Live Sales Count: ${salesLive.length}`);
  for (let s of salesLive) {
     console.log(`- ${s.policyId}: hcmId=${s.hcmId}, sellerId=${s.sellerId}`);
  }

  process.exit(0);
}

run();
