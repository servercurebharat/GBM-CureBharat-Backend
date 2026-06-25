const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  // Fix Punit Sata's network (Hierarchy: Punit HBA -> Nirmish HCM -> Vijay HCC)
  const punitHba = await db.collection('users').findOne({ memberId: 'CB-HBA-1000' });
  const nirmish = await db.collection('users').findOne({ memberId: 'CB-HCM-1002' });
  
  if (!nirmish) {
    // Recreate Nirmish if missing
    await db.collection('users').insertOne({
      name: 'Nirmish Acharya',
      mobile: '9900990099', // Dummy mobile
      email: 'nirmish@curebharat.dummy',
      role: 'hcm',
      rank: 'HCM',
      memberId: 'CB-HCM-1002',
      status: 'active',
      state: 'Gujarat',
      password: 'password123',
      createdAt: new Date(),
      teamSize: 0,
      personalSalesCount: 0
    });
    console.log('Recreated Nirmish');
  }

  const vijay = await db.collection('users').findOne({ memberId: 'CB-HCC-1011' }); 

  // Refresh references
  const nirmishRef = await db.collection('users').findOne({ memberId: 'CB-HCM-1002' });
  const punitHbaRef = await db.collection('users').findOne({ memberId: 'CB-HBA-1000' });
  
  if (punitHbaRef && nirmishRef) {
    await db.collection('users').updateOne(
      { _id: nirmishRef._id },
      { $set: { referrerId: punitHbaRef._id, sponsor: punitHbaRef._id, teamSize: 0 } }
    );
    console.log('Set Nirmish referrer to Punit Sata HBA');
    
    if (vijay) {
      await db.collection('users').updateOne(
        { _id: vijay._id },
        { $set: { referrerId: nirmishRef._id, sponsor: nirmishRef._id, teamSize: 0 } }
      );
      console.log('Set Vijay referrer to Nirmish');
    }
  }

  // Double check everything has teamSize = 0
  await db.collection('users').updateMany(
    { teamSize: { $exists: false } },
    { $set: { teamSize: 0, personalSalesCount: 0, totalTimeSpent: 0 } }
  );

  console.log('Done fixing the UI crash and Punit Sata network.');
  process.exit(0);
});
