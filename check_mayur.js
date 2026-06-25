const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  
  const sale = await dbTest.collection('sales').findOne({ policyId: 'CB-POL-178-9008' }); // Row 9 should be 9008? Let's search by customerName
  
  const saleByName = await dbTest.collection('sales').findOne({ customerName: { $regex: /Mayur Karia/i } });
  console.log("SALE:");
  console.log(JSON.stringify(saleByName, null, 2));

  if (saleByName && saleByName.sellerId) {
    const seller = await dbTest.collection('users').findOne({ _id: saleByName.sellerId });
    console.log("\nSELLER:");
    console.log(seller ? seller.name + " (" + seller.role + ")" : "Unknown");
    
    const wallet = await dbTest.collection('wallets').findOne({ user: saleByName.sellerId });
    console.log("\nSELLER WALLET LEDGER:");
    if (wallet && wallet.ledger) {
      console.log(JSON.stringify(wallet.ledger.filter(l => l.saleId && l.saleId.toString() === saleByName._id.toString()), null, 2));
    }
  }

  // Check HCM (HJ Finance)
  const hj = await dbTest.collection('users').findOne({ name: 'HJ Finance' });
  if (hj && saleByName) {
    const hjWallet = await dbTest.collection('wallets').findOne({ user: hj._id });
    console.log("\nHJ FINANCE WALLET LEDGER:");
    if (hjWallet && hjWallet.ledger) {
      console.log(JSON.stringify(hjWallet.ledger.filter(l => l.saleId && l.saleId.toString() === saleByName._id.toString()), null, 2));
    }
  }

  process.exit(0);
}

run();
