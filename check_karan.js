const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const sale = await dbTest.collection('sales').findOne({ customerName: { $regex: /Himmatbhai/i } });
  console.log("SALE:");
  console.log(JSON.stringify(sale, null, 2));

  if (sale && sale.sellerId) {
    const seller = await dbTest.collection('users').findOne({ _id: sale.sellerId });
    console.log("\nSELLER:");
    console.log(seller ? seller.name + " (" + seller.role + ")" : "Unknown");
  }

  // Find Karan Miyatra user
  const karan = await dbTest.collection('users').findOne({ name: { $regex: /Karan Miyatra/i } });
  if (karan) {
    console.log("\nKARAN MIYATRA USER:");
    console.log(karan.name, karan.role, karan.memberId);
  }

  process.exit(0);
}

run();
