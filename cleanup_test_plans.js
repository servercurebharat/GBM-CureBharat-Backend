const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  
  const dbTest = mongoose.connection.client.db('test');
  
  // 1. Remap sales from the duplicate "CureBharat..." plans to the original "CB-..." plans
  
  // Suraksha Special
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc309') },
     { $set: { plan: new mongoose.Types.ObjectId('69f987c171efe40908b3daba') } } // CB- Suraksha Special
  );
  
  // Super Suraksha
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30a') },
     { $set: { plan: new mongoose.Types.ObjectId('69f987c171efe40908b3dabb') } } // CB-Super Suraksha
  );
  
  // Sampoorna Suraksha Premium
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30b') },
     { $set: { plan: new mongoose.Types.ObjectId('69f987c171efe40908b3dabd') } } // CB-Sampoorna Suraksha Premium
  );
  
  // 2. Delete the duplicate plans
  const result = await dbTest.collection('plans').deleteMany({
      _id: { $in: [
          new mongoose.Types.ObjectId('6a3be3e90029061d4cacc309'),
          new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30a'),
          new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30b')
      ]}
  });
  
  console.log(`Successfully mapped sales to original CB- plans and deleted ${result.deletedCount} duplicate plans from the test database.`);

  process.exit(0);
}

run();
