const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' }); // Amit Mishra
    const lavish = await db.collection('users').findOne({ memberId: 'CB-HCC-1006' }); // Lavish Kulkarni
    
    if (!amit || !lavish) continue;

    // 1. Update Sale record to ensure Amit Mishra is the Seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9012' },
      {
        $set: {
          customerName: 'Lavish Kulkarni',
          customerMobile: '9584258103',
          customerEmail: 'lavishkulkarni@gmail.com',
          customerDOB: '15-Dec-76',
          customerState: 'MP',
          customerPAN: 'IWHPK1821A',
          nomineeName: 'Manisha Kulkarni',
          nomineeRelation: 'Wife',
          sellerId: amit._id,
          sellerMemberId: amit.memberId,
          hccId: null, // Since Amit (HCM) is direct seller
          hcmId: amit._id,
          hbaId: null,
          commissionProcessed: false
        }
      }
    );
    console.log('Updated Lavish sale in ' + db.databaseName);

    // 2. Clear old wallets for this policy
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9012/ } } } }
    );
    console.log('Cleared wallets for 9012');

    // 3. Update User profile for Lavish Kulkarni
    await db.collection('users').updateOne(
      { _id: lavish._id },
      {
        $set: {
          mobile: '9584258103',
          email: 'lavishkulkarni@gmail.com',
          dob: new Date('1976-12-15'),
          gender: 'Male',
          state: 'MP',
          address: {
            addressLine1: '32 Prime City, Sukhliya Indore',
            city: 'Indore',
            state: 'MP',
            zipCode: '452010'
          },
          familyDetails: [
            { name: 'Sandhya Kulkarni', relation: 'Mother', gender: 'Female', dob: '2-Jul-44' },
            { name: 'Manisha Kulkarni', relation: 'Wife', gender: 'Female', dob: '19-Apr-78' }
          ],
          nomineeDetails: {
            name: 'Manisha Kulkarni',
            relation: 'Wife',
            dob: '19-Apr-78',
            gender: 'Female'
          }
        }
      }
    );
    console.log('Updated Lavish user profile in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
