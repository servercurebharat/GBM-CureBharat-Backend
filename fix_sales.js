const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const sales = await db.collection('sales').find().toArray();
  const users = await db.collection('users').find().toArray();
  
  let fixedCount = 0;
  
  for (const sale of sales) {
    if (sale.sellerMemberId) {
      // Because we re-created users, some memberIds might have an 'X' appended!
      // Example: Jaysukhbhai is 'CB-HCC-1000X', but the sale might have 'CB-HCC-1000'
      const user = users.find(u => u.memberId === sale.sellerMemberId || u.memberId === sale.sellerMemberId + 'X');
      
      if (user) {
        // Update the sellerId to match the newly recreated user!
        await db.collection('sales').updateOne(
          { _id: sale._id },
          { $set: { sellerId: user._id, sellerMemberId: user.memberId } }
        );
        fixedCount++;
        console.log(`Updated Sale ${sale.customerName}: linked to ${user.name} (${user.memberId})`);
      } else {
        console.log(`WARNING: No user found for sellerMemberId ${sale.sellerMemberId}`);
      }
    }
  }

  console.log(`Successfully relinked ${fixedCount} sales to the new users!`);
  process.exit(0);
});
