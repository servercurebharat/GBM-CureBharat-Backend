const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const punit = await db.collection('users').findOne({ memberId: 'CB-HBA-1000' });
  if(punit) {
    await db.collection('users').updateOne(
      { memberId: 'CB-HCM-1001' },
      { $set: { referrerId: punit._id, sponsor: punit._id } }
    );
    console.log('HJ Finance linked to Punit Sata!');
  }

  process.exit(0);
});
