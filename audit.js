const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function auditDB(dbName) {
  console.log(`\n=== AUDITING DATABASE: ${dbName} ===`);
  const db = mongoose.connection.client.db(dbName);
  
  const users = await db.collection('users').find().toArray();
  const sales = await db.collection('sales').find().toArray();
  
  const userMap = {};
  users.forEach(u => userMap[u._id.toString()] = u);

  let issuesFound = 0;

  // 1. Audit Hierarchy
  console.log('\n[1] Checking Network Hierarchy...');
  
  const hj = users.find(u => /HJ Finance/i.test(u.name));
  if (hj && hj.referrerId) {
    console.log(`❌ ISSUE: HJ Finance has a referrer (${userMap[hj.referrerId.toString()]?.name}), but should be independent!`);
    issuesFound++;
  } else if (hj) {
    console.log(`✅ HJ Finance is correctly independent.`);
  }

  const amit = users.find(u => /Amit Mishra/i.test(u.name));
  if (amit && amit.referrerId) {
    console.log(`❌ ISSUE: Amit Mishra has a referrer (${userMap[amit.referrerId.toString()]?.name}), but should be independent!`);
    issuesFound++;
  } else if (amit) {
    console.log(`✅ Amit Mishra is correctly independent.`);
  }

  const nirmish = users.find(u => /Nirmish/i.test(u.name));
  const punit = users.find(u => /Punit Sata/i.test(u.name));
  if (nirmish && punit) {
    if (nirmish.referrerId?.toString() !== punit._id.toString()) {
      console.log(`❌ ISSUE: Nirmish is not reporting to Punit Sata!`);
      issuesFound++;
    } else {
      console.log(`✅ Nirmish Acharya correctly reports to Punit Sata.`);
    }
  }

  // 2. Audit Sales Sellers
  console.log('\n[2] Checking Sales Sellers...');
  const expectedSellers = {
    'Hirva Jayswal': 'HJ Finance',
    'Nirmish Acharya': 'Punit Sata',
    'Punit Sata': 'Punit Sata',
    'Jaysukhbhai Sonchhatra': 'Jaysukhbhai Sonchhatra',
    'Vijay Makwana': 'Vijay Makwana',
    'Amit Mishra': 'Amit Mishra',
    'Kalyani Sata': 'HJ Finance',
    'Mayur Karia': 'Mayur Karia',
    'Karan Miyatra': 'Karan Miyatra',
    'YAGNIK LALJIBHAI SABHAYA': 'Karan Miyatra',
    'Siddharth Shrivastava': 'Siddharth Shrivastava',
    'Neeraj Gupta': 'Neeraj Gupta',
    'Lavish Kulkarni': 'Lavish Kulkarni',
    'Kapil Dube': 'Kapil Dube',
    'Himmatbhai Miyatra': 'Karan Miyatra'
  };

  for (const sale of sales) {
    // Only check the ones we have expected rules for
    const expectedSellerName = expectedSellers[sale.customerName];
    if (expectedSellerName) {
      const actualSeller = userMap[sale.sellerId?.toString()];
      if (!actualSeller || !new RegExp(expectedSellerName, 'i').test(actualSeller.name)) {
        console.log(`❌ ISSUE: Sale for ${sale.customerName} has wrong seller! Expected: ${expectedSellerName}, Found: ${actualSeller?.name || 'None'}`);
        issuesFound++;
      } else {
         // console.log(`✅ Sale for ${sale.customerName} correctly mapped to ${actualSeller.name}`);
      }
    }
  }
  
  if (issuesFound === 0) {
    console.log('\n🎉 ALL HIERARCHY AND SALES MATCH THE EXCEL SHEET PERFECTLY!');
  } else {
    console.log(`\n⚠️ Found ${issuesFound} issues in ${dbName}.`);
  }
}

mongoose.connect(URI).then(async () => {
  await auditDB('test');
  await auditDB('curebharat');
  process.exit(0);
});
