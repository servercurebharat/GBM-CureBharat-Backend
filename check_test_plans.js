const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  console.log("--- PLANS ---");
  const plans = await dbTest.collection('plans').find().toArray();
  for (let p of plans) {
     console.log(`Plan: ${p.name} | ID: ${p._id}`);
  }
  
  console.log("--- HJ FINANCE SALES ---");
  const sales = await dbTest.collection('sales').find({ sellerId: new mongoose.Types.ObjectId('6a3bd7d4286cb84c196874ad') }).toArray();
  for (let s of sales) {
     console.log(`Policy: ${s.policyId} | Plan ID: ${s.plan}`);
  }
  
  process.exit(0);
}

run();
