const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const hj = await db.collection('users').findOne({ memberId: 'CB-HCM-1001' });
  if(hj) {
    await db.collection('users').updateOne(
      { _id: hj._id },
      { $unset: { referrerId: "", sponsor: "" } }
    );
    console.log('Unlinked HJ Finance! Now they report to System Direct.');
  }

  process.exit(0);
});
