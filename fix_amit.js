const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9006' },
      {
        $set: {
          customerMobile: '9826490451',
          customerEmail: 'amitmishra2222@gmail.com',
          customerDOB: '27-May-79',
          customerState: 'MP',
          customerPAN: 'ALBPM5347E',
          nomineeName: 'Shailly Mishra',
          nomineeRelation: 'Wife'
        }
      }
    );
    console.log('Updated Amit sale in ' + db.databaseName);

    // 2. Update User record (Amit Mishra - CB-HCM-1003)
    await db.collection('users').updateOne(
      { memberId: 'CB-HCM-1003' },
      {
        $set: {
          mobile: '9826490451',
          email: 'amitmishra2222@gmail.com',
          dob: new Date('1979-05-27'),
          gender: 'Male',
          state: 'MP',
          address: {
            addressLine1: '5-B, Subhash Nagar, Indore, MP',
            city: 'Indore',
            state: 'MP',
            zipCode: '452011'
          },
          familyDetails: [
            { name: 'Shailly Mishra', relation: 'Wife', gender: 'Female', dob: '11-Jul-80' },
            { name: 'Mahesh Mishra', relation: 'Father', gender: 'Male', dob: '28-Jan-54' },
            { name: 'Meera Mishra', relation: 'Mother', gender: 'Female', dob: '1-Jan-57' },
            { name: 'Samrat Mishra', relation: 'Son', gender: 'Male', dob: '3-Aug-05' }
          ],
          nomineeDetails: {
            name: 'Shailly Mishra',
            relation: 'Wife',
            dob: '11-Jul-80',
            gender: 'Female'
          }
        }
      }
    );
    console.log('Updated Amit user in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
