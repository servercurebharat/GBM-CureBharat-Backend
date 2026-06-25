const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    // 1. Update Sale record
    await db.collection('sales').updateOne(
      { policyId: 'CB-POL-178-9008' },
      {
        $set: {
          customerName: 'Mayur Karia',
          customerMobile: '9426188498',
          customerEmail: 'mayurkaria11@gmail.com',
          customerDOB: '11-Jan-66',
          customerState: 'Gujarat',
          customerPAN: 'ADGPK8776Q',
          nomineeName: 'Kiranben Karia',
          nomineeRelation: 'Wife',
          commissionProcessed: false // Force reprocess
        }
      }
    );
    console.log('Updated Mayur sale in ' + db.databaseName);

    // 2. Update User record (Mayur Karia - CB-HCC-1003)
    const mayur = await db.collection('users').findOne({ memberId: 'CB-HCC-1003' });
    if (mayur) {
      await db.collection('users').updateOne(
        { _id: mayur._id },
        {
          $set: {
            mobile: '9426188498',
            email: 'mayurkaria11@gmail.com',
            dob: new Date('1966-01-11'),
            gender: 'Male',
            state: 'Gujarat',
            address: {
              addressLine1: 'Nand Smruti 8/18, Karanpara, B/H S.T Bus Stand, Rajkot',
              city: 'Rajkot',
              state: 'Gujarat',
              zipCode: '360001'
            },
            familyDetails: [
              { name: 'Kiranben Karia', relation: 'Wife', gender: 'Female', dob: '14-Oct-68' },
              { name: 'Yashbhai Kariya', relation: 'Son', gender: 'Male', dob: '27-Jul-96' },
              { name: 'Deep Karia', relation: 'Son', gender: 'Male', dob: '12-Oct-00' }
            ],
            nomineeDetails: {
              name: 'Kiranben Karia',
              relation: 'Wife',
              dob: '14-Oct-68',
              gender: 'Female'
            }
          }
        }
      );
      console.log('Updated Mayur user in ' + db.databaseName);
      
      // Clear wallet ledger for this sale to avoid duplicates
      await db.collection('wallets').updateMany(
        {},
        { $pull: { ledger: { description: { $regex: /9008/ } } } }
      );
    }
  }
  
  process.exit(0);
}

run();
