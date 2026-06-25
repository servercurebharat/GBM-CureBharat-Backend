const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const sales = await db.collection('sales').find().toArray();
    let updatedCount = 0;
    
    for (let s of sales) {
      // Current saleAmount is stored in paise (e.g. 149900)
      // Check if it already has GST added (to avoid double adding if I run it twice)
      // If it ends in EXACT hundreds (like 149900), it probably doesn't have GST.
      const currentAmount = s.saleAmount / 100;
      
      if (currentAmount === 1499 || currentAmount === 1999 || currentAmount === 3999 || currentAmount === 4999 || currentAmount === 8999 || currentAmount === 9999) {
        const amountWithGST = Math.round(currentAmount * 1.18 * 100); // Back to paise
        await db.collection('sales').updateOne(
          { _id: s._id },
          { $set: { saleAmount: amountWithGST } }
        );
        updatedCount++;
      }
    }
    console.log(`Added 18% GST to ${updatedCount} sales in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
