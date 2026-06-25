const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const cureDb = mongoose.connection.client.db('curebharat');
  const testDb = mongoose.connection.client.db('test');
  
  const users = await cureDb.collection('users').find().toArray();
  let count = 0;
  for (let user of users) {
    if (user.mobile) {
      try {
        await testDb.collection('users').updateOne(
          { mobile: user.mobile },
          { $set: user },
          { upsert: true }
        );
        count++;
      } catch(err) {
        if (err.code === 11000) {
          // duplicate email error, let's remove the email and try again
          console.log(`Duplicate email for ${user.mobile}, ignoring email`);
          delete user.email;
          await testDb.collection('users').updateOne(
            { mobile: user.mobile },
            { $set: user },
            { upsert: true }
          ).catch(e => console.log('Still failed:', e.message));
          count++;
        }
      }
    }
  }
  
  console.log(`Successfully copied ${count} users to test DB!`);
  process.exit(0);
});
