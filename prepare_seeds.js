const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  const mobiles = ['9826490451', '9898161195', '9978944422', '7405077077', '9977102030', '9924216843', '9584258103', '9426188498', '9406589900', '7000274766', '9974305505'];
  
  const users = await db.collection('users').find({ mobile: { $in: mobiles } }).toArray();
  for (let u of users) {
    console.log(`Modifying mobile for spouse/customer: ${u.name} (${u.mobile})`);
    await db.collection('users').updateOne(
      { _id: u._id },
      { $set: { mobile: u.mobile + '1' } } // Append '1' to free up the original 10-digit mobile
    );
  }
  
  console.log('Done preparing database for seeding.');
  process.exit(0);
});
