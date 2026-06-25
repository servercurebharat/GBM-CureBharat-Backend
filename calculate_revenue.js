const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.client.db('test');
  
  const sales = await db.collection('sales').find().toArray();
  
  let totalRevenue = 0;
  console.log('--- Breakdown ---');
  for (let s of sales) {
    console.log(`${s.customerName}: ₹${s.saleAmount / 100}`);
    totalRevenue += (s.saleAmount / 100);
  }
  
  console.log('\n-----------------');
  console.log(`Total Sales Count: ${sales.length}`);
  console.log(`Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);

  process.exit(0);
}

run();
