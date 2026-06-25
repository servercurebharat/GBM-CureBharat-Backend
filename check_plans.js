const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.client.db('curebharat');
  
  const plans = await db.collection('plans').find().toArray();
  console.log('Plans in curebharat db:');
  for (let p of plans) console.log(`- ${p._id}: ${p.name}`);

  const sales = await db.collection('sales').find().limit(5).toArray();
  console.log('\nSales plan field in curebharat db:');
  for (let s of sales) console.log(`- ${s.policyId}: plan = ${s.plan}`);
  
  process.exit(0);
}

run();
