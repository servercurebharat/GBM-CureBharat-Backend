const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://harshladukar:harshal@cluster0.d4dxof3.mongodb.net/curebharat').then(async () => {
  const db = mongoose.connection.db;
  
  await db.collection('users').updateOne(
    { mobile: '9689509651' },
    { $set: { name: 'Harshal Admin', email: 'harshalsynture@gmail.com', password: '123456789', role: 'admin', rank: 'ADMIN', memberId: 'CB-ADMIN-1', status: 'active', createdAt: new Date() } },
    { upsert: true }
  );
  
  await db.collection('users').updateOne(
    { mobile: '8269210100' },
    { $set: { name: 'Namdev Admin', email: 'Namdevsanskar2000@gmail.com', password: '123456789', role: 'admin', rank: 'ADMIN', memberId: 'CB-ADMIN-2', status: 'active', createdAt: new Date() } },
    { upsert: true }
  );

  console.log('Admins added');
  process.exit(0);
});
