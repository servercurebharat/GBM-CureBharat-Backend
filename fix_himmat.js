const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record for Himmatbhai Miyatra
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9009' },
      {
        $set: {
          customerName: 'Himmatbhai Miyatra',
          customerMobile: '9924216843',
          customerEmail: 'karanmiyatra0837@gmail.com',
          customerDOB: '1-Jan-78',
          customerState: 'Gujarat',
          customerPAN: 'BLNPM8431J',
          nomineeName: 'Karan Miyatra',
          nomineeRelation: 'Son'
        }
      }
    );
    console.log('Updated Himmatbhai sale in ' + db.databaseName);

    // 2. Update User record (Karan Miyatra - CB-HCC-1004) if he exists
    const karan = await db.collection('users').findOne({ memberId: 'CB-HCC-1004' });
    if (karan) {
      await db.collection('users').updateOne(
        { _id: karan._id },
        {
          $set: {
            mobile: '9924216843', // Using same mobile for contact
            email: 'karanmiyatra0837@gmail.com',
            state: 'Gujarat',
            address: {
              addressLine1: 'Anandpar Navagam, Rajkot, Gujarat',
              city: 'Rajkot',
              state: 'Gujarat',
              zipCode: '360003'
            },
            familyDetails: [
              { name: 'Karan Miyatra', relation: 'Son', gender: 'Male', dob: '2-Apr-01' },
              { name: 'Sunitaben Miyatra', relation: 'Wife', gender: 'Female', dob: '1-Jan-82' },
              { name: 'Vaishali Miyatra', relation: 'Daughter', gender: 'Female', dob: '8-Jul-99' }
            ],
            nomineeDetails: {
              name: 'Karan Miyatra',
              relation: 'Son',
              dob: '2-Apr-01',
              gender: 'Male'
            }
          }
        }
      );
      console.log('Updated Karan user profile in ' + db.databaseName);
    }

    // 3. Remove override commission for HJ Finance to strictly match 0% HCM requirement
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9009/ }, type: 'override' } } }
    );
    console.log('Removed override for 9009 in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
