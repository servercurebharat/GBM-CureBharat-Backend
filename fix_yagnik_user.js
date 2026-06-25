const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const yagnik = await db.collection('users').findOne({ memberId: 'CB-HCC-1007' });
    if (yagnik) {
      await db.collection('users').updateOne(
        { _id: yagnik._id },
        {
          $set: {
            mobile: '7575850216',
            email: 'yagnik.sabhaya4444@gmail.com',
            dob: new Date('1994-08-17'),
            gender: 'Male',
            state: 'Gujarat',
            address: {
              addressLine1: 'Sai shree khodiyar krupa, shivam park st no 1 , morbid road, rajkot',
              city: 'Rajkot',
              state: 'Gujarat',
              zipCode: '360003'
            },
            familyDetails: [
              { name: 'Sabhaya Shweta Yagnikbhai', relation: 'Wife', gender: 'Female', dob: '12-Nov-94' },
              { name: 'Sabhaya Devarsh yagnik', relation: 'Son', gender: 'Male', dob: '29-Oct-20' },
              { name: 'Sabhaya Laljibhai parsottambhai', relation: 'Father', gender: 'Male', dob: '22-Oct-65' },
              { name: 'Sabhaya Dayaben laljibhai', relation: 'Mother', gender: 'Female', dob: '16-Jan-71' }
            ],
            nomineeDetails: {
              name: 'SABHAYA LALJIBHAI PARSOTTAMBHAI',
              relation: 'Father',
              dob: '22-Oct-65',
              gender: 'Male'
            }
          }
        }
      );
      console.log('Updated Yagnik user profile in ' + db.databaseName);
    }
  }
  
  process.exit(0);
}

run();
