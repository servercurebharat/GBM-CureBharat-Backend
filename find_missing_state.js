const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.client.db('curebharat');
  
  const sales = await db.collection('sales').find().toArray();
  for (let s of sales) {
    if (!s.customerState || s.customerState === 'Unknown') {
      console.log(`Missing state for: ${s.customerName} (Policy: ${s.policyId}, Amount: ${s.saleAmount / 100})`);
    }
  }

  process.exit(0);
}

run();
