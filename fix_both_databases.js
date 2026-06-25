const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  
  // 1. Fix TEST database
  const dbTest = mongoose.connection.client.db('test');
  
  // Map back to test DB plan IDs
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e438') },
     { $set: { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc309') } }
  );
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e439') },
     { $set: { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30a') } }
  );
  await dbTest.collection('sales').updateMany(
     { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e43a') },
     { $set: { plan: new mongoose.Types.ObjectId('6a3be3e90029061d4cacc30b') } }
  );
  
  console.log("Fixed Test DB");

  // 2. Fix LIVE database (curebharat)
  const dbLive = mongoose.connection.client.db('curebharat');
  
  // The LIVE db has '69fadfa9f1b153d12888e43a' (Base) assigned to Anandkumar and Mayur.
  // We need to change it to '69fadfa9f1b153d12888e43b' (Premium)
  await dbLive.collection('sales').updateOne(
     { policyId: 'CB-POL-178-9007' },
     { $set: { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e43b') } }
  );
  await dbLive.collection('sales').updateOne(
     { policyId: 'CB-POL-178-9008' },
     { $set: { plan: new mongoose.Types.ObjectId('69fadfa9f1b153d12888e43b') } }
  );
  
  console.log("Fixed Live DB");

  process.exit(0);
}

run();
