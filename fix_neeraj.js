const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    const amit = await db.collection('users').findOne({ memberId: 'CB-HCM-1003' }); // Amit Mishra
    const neeraj = await db.collection('users').findOne({ memberId: 'CB-HCC-1005' }); // Neeraj Gupta
    
    if (!amit || !neeraj) continue;

    // 1. Update Sale record to ensure Amit Mishra is the Seller
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9011' },
      {
        $set: {
          customerName: 'Neeraj Gupta',
          customerMobile: '9406589900',
          customerEmail: 'Neerajnagria@gmail.com',
          customerDOB: '15-Aug-77',
          customerState: 'MP',
          customerPAN: 'AMNPG9547M',
          nomineeName: 'Krishna Gupta',
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
    console.log('Updated Neeraj sale in ' + db.databaseName);

    // 2. Clear old wallets for this policy
    await db.collection('wallets').updateMany(
      {},
      { $pull: { ledger: { description: { $regex: /CB-POL-178-9011/ } } } }
    );
    console.log('Cleared wallets for 9011');

    // 3. Update User profile for Neeraj Gupta
    await db.collection('users').updateOne(
      { _id: neeraj._id },
      {
        $set: {
          mobile: '9406589900',
          email: 'Neerajnagria@gmail.com',
          dob: new Date('1977-08-15'),
          gender: 'Male',
          state: 'MP',
          address: {
            addressLine1: 'NAGARIA MEDICAL STORE, KARERA, MP',
            city: 'Karera',
            state: 'MP',
            zipCode: '473660'
          },
          familyDetails: [
            { name: 'Krishna Gupta', relation: 'Wife', gender: 'Female', dob: '30-Sep-79' },
            { name: 'Riya Gupta', relation: 'Daughter', gender: 'Female', dob: '19-Dec-03' },
            { name: 'Shresth Gupta', relation: 'Son', gender: 'Male', dob: '1-Aug-11' },
            { name: 'Ramswaroop Gupta', relation: 'Father', gender: 'Male' }, // No DOB provided
            { name: 'Laxmi Gupta', relation: 'Mother', gender: 'Female' } // No DOB provided
          ],
          nomineeDetails: {
            name: 'Krishna Gupta',
            relation: 'Wife',
            dob: '30-Sep-79',
            gender: 'Female'
          }
        }
      }
    );
    console.log('Updated Neeraj user profile in ' + db.databaseName);
  }
  
  process.exit(0);
}

run();
