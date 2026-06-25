const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const punit = await db.collection('users').findOne({ memberId: 'CB-HBA-1000' });
  
  if (punit) {
    const res = await db.collection('sales').updateMany(
      { sellerMemberId: 'CB-HCM-1000' },
      { $set: { sellerId: punit._id, sellerMemberId: punit.memberId } }
    );
    console.log('Fixed Punit sales:', res.modifiedCount);
  }

  process.exit(0);
});
