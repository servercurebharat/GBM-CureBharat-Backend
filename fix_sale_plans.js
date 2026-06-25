const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

// Wrong IDs to correct IDs based on plan name
const planMapping = {
  // CureBharat Surksha Special
  '6a3be3e90029061d4cacc309': '69fadfa9f1b153d12888e438', 
  // CureBharat Super Surksha
  '6a3be3e90029061d4cacc30a': '69fadfa9f1b153d12888e439', 
  // CureBharat Sampoorna Surksha Premium
  '6a3be3e90029061d4cacc30c': '69fadfa9f1b153d12888e43b', 
  // CureBharat Sampoorna Surksha Plus
  '6a3be3e90029061d4cacc30d': '6a1ac8955983c4caa58930aa', 
};

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const sales = await db.collection('sales').find().toArray();
    let updatedCount = 0;
    
    for (let s of sales) {
      if (s.plan && planMapping[s.plan.toString()]) {
        await db.collection('sales').updateOne(
          { _id: s._id },
          { $set: { plan: new mongoose.Types.ObjectId(planMapping[s.plan.toString()]) } }
        );
        updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} plan IDs in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
