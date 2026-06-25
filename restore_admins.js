const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  await db.collection('users').updateOne(
    { mobile: '9689509651' },
    { $set: { name: 'Harshal Admin', email: 'harshalsynture@gmail.com', password: '123456789', role: 'admin', rank: 'ADMIN', memberId: 'CB-ADMIN-1', status: 'active', createdAt: new Date(), teamSize: 0, personalSalesCount: 0 } },
    { upsert: true }
  );

  await db.collection('users').updateOne(
    { mobile: '8269210100' },
    { $set: { name: 'Namdev Admin', email: 'Namdevsanskar2000@gmail.com', password: '123456789', role: 'admin', rank: 'ADMIN', memberId: 'CB-ADMIN-2', status: 'active', createdAt: new Date(), teamSize: 0, personalSalesCount: 0 } },
    { upsert: true }
  );

  console.log('Admins restored');
  process.exit(0);
});
