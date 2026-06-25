const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  
  for (const dbName of ['test', 'curebharat']) {
    const db = mongoose.connection.client.db(dbName);
    
    const wallets = await db.collection('wallets').find().toArray();
    let updatedCount = 0;
    
    for (let wallet of wallets) {
       let modified = false;
       for (let l of wallet.ledger) {
          if (!l._id) {
             l._id = new mongoose.Types.ObjectId();
             modified = true;
          }
       }
       if (modified) {
          await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: { ledger: wallet.ledger } });
          updatedCount++;
       }
    }
    console.log(`[${dbName}] Fixed ledger IDs for ${updatedCount} wallets`);
  }
  
  process.exit(0);
}

run();
