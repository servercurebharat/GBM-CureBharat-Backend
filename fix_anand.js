const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9007' },
      {
        $set: {
          customerName: 'Anandkumar Kalal',
          customerMobile: '9898161195',
          customerEmail: 'anand_kalal@yahoo.com',
          customerDOB: '21-Feb-86',
          customerState: 'Gujarat',
          nomineeName: 'Nehaben Kalal',
          nomineeRelation: 'Wife'
        }
      }
    );
    console.log('Updated Anandkumar sale in ' + db.databaseName);

    // 2. See if there is a User account for Anandkumar Kalal and update it if it exists
    const anand = await db.collection('users').findOne({ mobile: '9898161195' });
    if (anand) {
      await db.collection('users').updateOne(
        { _id: anand._id },
        {
          $set: {
            name: 'Anand Kumar Kalal',
            email: 'anand_kalal@yahoo.com',
            dob: new Date('1986-02-21'),
            gender: 'Male',
            state: 'Gujarat',
            address: {
              addressLine1: 'Mota Thakor Vas, Jagudan, Mehsana - 382710',
              city: 'Mehsana',
              state: 'Gujarat',
              zipCode: '382710'
            },
            familyDetails: [
              { name: 'Nehaben Kalal', relation: 'Wife', gender: 'Female', dob: '27-Nov-89' },
              { name: 'Chandrikaben Kalal', relation: 'Mother', gender: 'Female', dob: '1-Dec-57' },
              { name: 'Harsh Kalal', relation: 'Son', gender: 'Male', dob: '26-Jul-14' },
              { name: 'Hiyan Kalal', relation: 'Son', gender: 'Male', dob: '23-Dec-21' }
            ],
            nomineeDetails: {
              name: 'Nehaben Kalal',
              relation: 'Wife',
              dob: '27-Nov-89',
              gender: 'Female'
            }
          }
        }
      );
      console.log('Updated Anandkumar user in ' + db.databaseName);
    }
  }
  
  process.exit(0);
}

run();
