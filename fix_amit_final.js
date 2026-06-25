const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' });
    if (!amit) continue;

    const wallet = await db.collection('wallets').findOne({ user: amit._id });
    if (wallet) {
      // Correct total is 4798.80
      const correctTotalPaise = 479880; 
      
      await db.collection('wallets').updateOne(
        { _id: wallet._id },
        { 
          $set: { 
            totalIncome: correctTotalPaise,
            currentBalance: correctTotalPaise
          }
        }
      );
      console.log(`Set correct wallet balance for Amit Mishra in ${db.databaseName}`);
    }
  }

  process.exit(0);
}

run();
