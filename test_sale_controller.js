const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbLive = mongoose.connection.client.db('curebharat');
  
  const hjId = '6a3bd7d6286cb84c196874e0';
  
  // Fake the Sale model
  const sales = await dbLive.collection('sales').find({ sellerId: new mongoose.Types.ObjectId(hjId) }).toArray();
  
  // Fake the Wallet model
  const targetWallet = await dbLive.collection('wallets').findOne({ user: new mongoose.Types.ObjectId(hjId) });
  
  const processedSales = sales.map((sale) => {
      let commission = 0;
      if (targetWallet && targetWallet.ledger) {
        const entry = targetWallet.ledger.find((l) => 
          (l.saleId && l.saleId.toString() === sale._id.toString()) || 
          (l.description && l.description.includes(sale.policyId))
        );
        if (entry) commission = entry.amount;
      }
      return { policyId: sale.policyId, commission };
  });
  
  console.log(processedSales);
  
  process.exit(0);
}

run();
