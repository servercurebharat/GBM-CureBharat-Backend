require('dotenv').config();
const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  
  for (const dbName of ['test', 'curebharat']) {
    console.log(`\n\n--- REBUILDING COMMISSION WALLETS FOR ${dbName} ---`);
    const db = mongoose.connection.client.db(dbName);
    
    // 1. Wipe all wallets
    await db.collection('wallets').deleteMany({});
    console.log(`[${dbName}] Wiped all legacy wallets`);
    
    // 2. Fetch all users
    const users = await db.collection('users').find().toArray();
    for (const user of users) {
      await db.collection('wallets').insertOne({
        user: user._id,
        provisionalBalance: 0,
        finalBalance: 0,
        totalEarned: 0, // This is the old schema field
        totalIncome: 0,
        totalWithdrawn: 0,
        frozen: false,
        frozenReason: '',
        ledger: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    console.log(`[${dbName}] Re-created ${users.length} fresh empty wallets`);
    
    // 3. Process all sales
    const sales = await db.collection('sales').find().sort({ createdAt: 1 }).toArray();
    
    for (const sale of sales) {
      if (!sale.sellerId) {
         console.log(`[${dbName}] Skipping ${sale.policyId} - No seller found (e.g. self-purchase)`);
         continue;
      }
      
      const bv = sale.businessVolume || 0;
      let totalCommissionsPaise = 0;
      
      // Calculate 40% direct
      if (sale.hcmId) {
         const payout = Math.floor(bv * 0.4);
         totalCommissionsPaise += payout;
         
         const wallet = await db.collection('wallets').findOne({ user: sale.hcmId });
         if (wallet) {
            wallet.totalEarned = (wallet.totalEarned || 0) + payout;
            wallet.finalBalance = (wallet.finalBalance || 0) + payout;
            wallet.ledger.push({
               amount: payout,
               type: 'direct',
               description: `Direct commission from ${sale.sellerMemberId || 'Unknown'} - Policy ${sale.policyId}`,
               status: 'final',
               date: sale.createdAt,
               saleId: sale._id,
               cycleMonth: '2026-06'
            });
            await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: wallet });
         }
      }
      
      // Calculate 2% HBA override (if applicable and if seller is NOT HBA)
      // For row 6, Punit got HBA override
      if (sale.hbaId && sale.hbaId.toString() !== sale.sellerId.toString()) {
         const payout = Math.floor(bv * 0.02);
         const wallet = await db.collection('wallets').findOne({ user: sale.hbaId });
         if (wallet) {
            wallet.totalEarned = (wallet.totalEarned || 0) + payout;
            wallet.finalBalance = (wallet.finalBalance || 0) + payout;
            wallet.ledger.push({
               amount: payout,
               type: 'override',
               description: `HBA override from ${sale.sellerMemberId || 'Unknown'} - Policy ${sale.policyId}`,
               status: 'final',
               date: sale.createdAt,
               saleId: sale._id,
               cycleMonth: '2026-06'
            });
            await db.collection('wallets').updateOne({ _id: wallet._id }, { $set: wallet });
         }
      }
      
      console.log(`[${dbName}] Processed ${sale.policyId} successfully!`);
    }
    
    console.log(`[${dbName}] Commission Re-Build Complete!`);
  }
  process.exit(0);
}

run();
