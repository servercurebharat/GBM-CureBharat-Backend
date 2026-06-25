const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record for Siddharth
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9010' },
      {
        $set: {
          customerName: 'Siddharth Shrivastava',
          customerMobile: '7000274766',
          customerEmail: 'sid.shree@gmail.com',
          customerDOB: '7-Dec-75',
          customerState: 'MP',
          customerPAN: 'CLBPS4661M',
          nomineeName: 'Rakhi Shrivastava',
          nomineeRelation: 'Wife',
          hccId: null, // He is an HCM
          hbaId: null
        }
      }
    );
    console.log('Updated Siddharth sale in ' + db.databaseName);

    // 2. Update User record (Siddharth - CB-HCM-1004)
    const sid = await db.collection('users').findOne({ memberId: 'CB-HCM-1004' });
    if (sid) {
      await db.collection('users').updateOne(
        { _id: sid._id },
        {
          $set: {
            mobile: '7000274766',
            email: 'sid.shree@gmail.com',
            dob: new Date('1975-12-07'),
            gender: 'Male',
            state: 'MP',
            address: {
              addressLine1: '1511, Ganga Nagar, Nav Niwas Colony Garha, Jabalpur, Madhya Pradesh',
              city: 'Jabalpur',
              state: 'MP',
              zipCode: '482003'
            },
            familyDetails: [
              { name: 'Rakhi Shrivastava', relation: 'Wife', gender: 'Female', dob: '6-Aug-80' },
              { name: 'Kanhanayialal Shrivastava', relation: 'Father', gender: 'Male', dob: '18-Jun-36' },
              { name: 'Shashi Shrivastava', relation: 'Mother', gender: 'Female', dob: '24-Apr-48' },
              { name: 'Arindam Shrivastava', relation: 'Son', gender: 'Male', dob: '5-Jul-07' },
              { name: 'Arinjay Shrivastava', relation: 'Son', gender: 'Male', dob: '6-Aug-14' }
            ],
            nomineeDetails: {
              name: 'Rakhi Shrivastava',
              relation: 'Wife',
              dob: '6-Aug-80',
              gender: 'Female'
            }
          }
        }
      );
      console.log('Updated Siddharth user profile in ' + db.databaseName);
    }
  }
  
  process.exit(0);
}

run();
