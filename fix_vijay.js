const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9005' },
      {
        $set: {
          customerMobile: '9974305505',
          customerEmail: 'Vijaymakwana929@gmail.com',
          customerDOB: '22-Aug-65',
          customerState: 'Gujarat',
          customerPAN: 'AKVPM2939D',
          nomineeName: 'Alka Makwana',
          nomineeRelation: 'Wife'
        }
      }
    );
    console.log('Updated Vijay sale in ' + db.databaseName);

    // 2. Update User record (Vijay Makwana)
    await db.collection('users').updateOne(
      { memberId: 'CB-HCC-1001' },
      {
        $set: {
          mobile: '9974305505',
          email: 'Vijaymakwana929@gmail.com',
          dob: new Date('1965-08-22'),
          gender: 'Male',
          address: {
            addressLine1: 'A-403, Vienza, Swarnip Stone Road, Chharodi 5 6 Highway',
            city: 'Ahmedabad',
            state: 'Gujarat',
            zipCode: '382481'
          },
          familyDetails: [
            { name: 'Alka Makwana', relation: 'Wife', gender: 'Female', dob: '22-Aug-71' },
            { name: 'Harsh Makwana', relation: 'Son', gender: 'Male', dob: '23-Mar-94' },
            { name: 'Dhruv Makwana', relation: 'Son', gender: 'Male', dob: '26-Oct-98' }
          ],
          nomineeDetails: {
            name: 'Alka Makwana',
            relation: 'Wife',
            dob: '22-Aug-71',
            gender: 'Female'
          }
        }
      }
    );
    console.log('Updated Vijay user in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
