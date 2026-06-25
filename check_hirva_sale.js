const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const sale = await dbTest.collection('sales').findOne({ policyId: 'CB-POL-178-9000' });
  if (sale) {
     console.log("Seller ID:", sale.sellerId);
     console.log("Customer:", sale.customerName);
     
     const seller = await dbTest.collection('users').findOne({ _id: sale.sellerId });
     console.log("Seller Name:", seller ? seller.name : "Not Found");
     
     // Check if Hirva is a user
     const hirva = await dbTest.collection('users').findOne({ name: /Hirva/i });
     console.log("Hirva as User:", hirva ? hirva.role : "Not Found");
  } else {
     console.log("Sale not found in test");
  }

  // Also check curebharat DB
  const dbLive = mongoose.connection.client.db('curebharat');
  const saleLive = await dbLive.collection('sales').findOne({ policyId: 'CB-POL-178-9000' });
  if (saleLive) {
     console.log("LIVE - Seller ID:", saleLive.sellerId);
     console.log("LIVE - Customer:", saleLive.customerName);
     
     const sellerLive = await dbLive.collection('users').findOne({ _id: saleLive.sellerId });
     console.log("LIVE - Seller Name:", sellerLive ? sellerLive.name : "Not Found");
     
     const hirvaLive = await dbLive.collection('users').findOne({ name: /Hirva/i });
     console.log("LIVE - Hirva as User:", hirvaLive ? hirvaLive.role : "Not Found");
  }
  
  process.exit(0);
}

run();
