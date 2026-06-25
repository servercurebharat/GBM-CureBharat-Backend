const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.client.db('test');
  
  // 1. Get all unique users
  const users = await db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
  
  let hccCount = 0;
  let hcmCount = 0;
  let hbaCount = 0;
  
  for (let u of users) {
    if (u.role === 'hcc') hccCount++;
    if (u.role === 'hcm') hcmCount++;
    if (u.role === 'hba') hbaCount++;
  }
  
  console.log(`Total non-admin users: ${users.length}`);
  console.log(`Customers (HCC - Only bought, didn't recruit): ${hccCount}`);
  console.log(`Distributors (HCM/HBA - Sold policies): ${hcmCount + hbaCount}`);
  console.log(`   - HCMs: ${hcmCount}`);
  console.log(`   - HBAs: ${hbaCount}`);

  // Let's also count from the Sales collection to match the 15 rows
  const sales = await db.collection('sales').find().toArray();
  console.log(`\nTotal Sales Rows: ${sales.length}`);
  
  process.exit(0);
}

run();
