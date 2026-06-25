const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.client.db('test');
  
  const wallets = await db.collection('wallets').find().toArray();
  for (let w of wallets) {
    for (let l of w.ledger) {
      console.log(`Desc: ${l.description}, Date: ${l.date}`);
    }
  }

  process.exit(0);
}

run();
