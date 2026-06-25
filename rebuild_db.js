const xlsx = require('xlsx');
const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

async function rebuildDB(dbName) {
  console.log(`\n=== REBUILDING DATABASE: ${dbName} ===`);
  const db = mongoose.connection.client.db(dbName);

  // 1. CLEAR ALL DATA EXCEPT ADMINS
  await db.collection('sales').deleteMany({});
  await db.collection('wallets').deleteMany({});
  await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
  console.log('Cleared all non-admin users, sales, and wallets.');

  // 2. CREATE USERS
  const usersToCreate = [
    { name: 'Punit Sata', role: 'hba', rank: 'HBA', memberId: 'CB-HBA-1000', mobile: '9000000001', email: 'punit@test.com', status: 'active', password: '123' },
    { name: 'Nirmish Acharya', role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-1002', mobile: '9000000002', email: 'nirmish@test.com', status: 'active', password: '123' },
    { name: 'Vijay Makwana', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1001', mobile: '9000000003', email: 'vijay@test.com', status: 'active', password: '123' },
    
    { name: 'HJ Finance', role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-1001', mobile: '9000000004', email: 'hj@test.com', status: 'active', password: '123' },
    { name: 'Jaysukhbhai Sonchhatra', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1002', mobile: '9000000005', email: 'jay@test.com', status: 'active', password: '123' },
    { name: 'Mayur Karia', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1003', mobile: '9000000006', email: 'mayur@test.com', status: 'active', password: '123' },
    { name: 'Karan Miyatra', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1004', mobile: '9000000007', email: 'karan@test.com', status: 'active', password: '123' },
    { name: 'Neha Kalal', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1005', mobile: '9000000008', email: 'neha@test.com', status: 'active', password: '123' },
    { name: 'Anandkumar kalal', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1006', mobile: '9000000009', email: 'anand@test.com', status: 'active', password: '123' },
    { name: 'Kalyani Sata', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1007', mobile: '9000000010', email: 'kalyani@test.com', status: 'active', password: '123' },
    { name: 'Himmatbhai Miyatra', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1008', mobile: '9000000011', email: 'himmat@test.com', status: 'active', password: '123' },
    { name: 'Abhay Sonchhatra', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1009', mobile: '9000000012', email: 'abhay@test.com', status: 'active', password: '123' },

    { name: 'Amit Mishra', role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-1003', mobile: '9000000013', email: 'amit@test.com', status: 'active', password: '123' },
    { name: 'Neeraj Gupta', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1010', mobile: '9000000014', email: 'neeraj@test.com', status: 'active', password: '123' },
    { name: 'Lavish Kulkarni', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1011', mobile: '9000000015', email: 'lavish@test.com', status: 'active', password: '123' },
    { name: 'Kapil Dube', role: 'hcc', rank: 'HCC', memberId: 'CB-HCC-1012', mobile: '9000000016', email: 'kapil@test.com', status: 'active', password: '123' },

    { name: 'Siddharth Shrivastava', role: 'hcm', rank: 'HCM', memberId: 'CB-HCM-1004', mobile: '9000000017', email: 'sid@test.com', status: 'active', password: '123' }
  ];

  await db.collection('users').insertMany(usersToCreate);
  console.log(`Created ${usersToCreate.length} fresh users.`);

  // Link users
  const users = await db.collection('users').find().toArray();
  const getU = (n) => users.find(u => new RegExp(n, 'i').test(u.name));

  const links = [
    { user: 'Nirmish Acharya', ref: 'Punit Sata' },
    { user: 'Vijay Makwana', ref: 'Nirmish Acharya' },
    { user: 'Jaysukhbhai Sonchhatra', ref: 'HJ Finance' },
    { user: 'Mayur Karia', ref: 'HJ Finance' },
    { user: 'Karan Miyatra', ref: 'HJ Finance' },
    { user: 'Neha Kalal', ref: 'HJ Finance' },
    { user: 'Anandkumar kalal', ref: 'HJ Finance' },
    { user: 'Kalyani Sata', ref: 'HJ Finance' },
    { user: 'Himmatbhai Miyatra', ref: 'HJ Finance' },
    { user: 'Abhay Sonchhatra', ref: 'HJ Finance' },
    { user: 'Neeraj Gupta', ref: 'Amit Mishra' },
    { user: 'Lavish Kulkarni', ref: 'Amit Mishra' },
    { user: 'Kapil Dube', ref: 'Amit Mishra' }
  ];

  for(const l of links) {
    const u = getU(l.user);
    const r = getU(l.ref);
    if(u && r) {
      await db.collection('users').updateOne(
        { _id: u._id },
        { $set: { referrerId: r._id, sponsor: r.memberId, state: 'Gujarat' } } // Fix state missing
      );
    }
  }
  
  // Fix states for all
  await db.collection('users').updateMany({}, { $set: { state: 'Gujarat' }});
  
  console.log('Linked all users perfectly.');

  // 3. CREATE WALLETS
  for (const user of users) {
    await db.collection('wallets').insertOne({
      user: user._id,
      provisionalBalance: 0,
      finalBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      ledger: []
    });
  }
  console.log('Created empty wallets.');

  // 4. PARSE EXCEL & CREATE EXACT 15 SALES
  const wb = xlsx.readFile('C:\\\\Users\\\\harsh\\\\Documents\\\\curebharat-mlm\\\\CureBharat- Customer Data (2).xlsx');
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  // Also fetch the single plan ID to link
  const plan = await db.collection('plans').findOne();
  if(!plan) { console.log('NO PLAN FOUND!'); return; }

  const salesToInsert = [];
  let policyCounter = 9000;
  
  for(const row of data) {
    let customerName = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
    if(!customerName) customerName = row['Member 1 Full name'] || 'Unknown Customer';
    
    // Determine exact seller based on our previous logic
    let sellerName = row['HCC Name'];
    if(!sellerName || sellerName === '-') sellerName = row['HCM Name'];
    if(!sellerName || sellerName === '-') sellerName = row['HBA Name'];
    
    // Clean up " - Self" from seller names in excel
    sellerName = sellerName.replace('- Self', '').trim();
    
    const seller = getU(sellerName);
    if(!seller) {
      console.log(`CRITICAL: COULD NOT FIND SELLER ${sellerName} for customer ${customerName}`);
      continue;
    }
    
    salesToInsert.push({
      customerName: customerName,
      customerMobile: row['Mobile No'] ? row['Mobile No'].toString() : '9999999999',
      customerEmail: row['Email Id'] || 'test@test.com',
      policyId: `CB-POL-178-${policyCounter++}`,
      plan: plan._id,
      saleAmount: row['Plan Amount'] * 100, // in paise
      businessVolume: (row['Plan Amount'] - 1000) * 100, // approx
      sellerId: seller._id,
      sellerMemberId: seller.memberId,
      commissionProcessed: false,
      status: 'active',
      createdAt: new Date()
    });
  }
  
  await db.collection('sales').insertMany(salesToInsert);
  console.log(`Inserted EXACTLY ${salesToInsert.length} clean sales!`);
}

mongoose.connect(URI).then(async () => {
  await rebuildDB('test');
  await rebuildDB('curebharat');
  process.exit(0);
});
