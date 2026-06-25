const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  await db.collection('users').insertOne({ 
    name: 'Amit Mishra', 
    mobile: '9826490451', 
    email: 'amit@curebharat.dummy', 
    role: 'hcm', 
    rank: 'HCM', 
    memberId: 'CB-HCM-1003', 
    status: 'active', 
    state: 'Gujarat', 
    password: 'password123', 
    createdAt: new Date(), 
    teamSize: 0, 
    personalSalesCount: 0 
  });
  
  const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' });
  
  if(amit) {
    await db.collection('users').updateMany(
      { name: { $in: [ /Neeraj/i, /Lavish/i, /Kapil/i ] } },
      { $set: { referrerId: amit._id, sponsor: amit._id } }
    );
    console.log('Amit Mishra inserted and linked to Neeraj, Lavish, and Kapil!');
  }

  process.exit(0);
});
