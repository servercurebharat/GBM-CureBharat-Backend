const mongoose = require('mongoose');

const TEST_URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';
const CURE_URI = 'mongodb+srv://harshladukar:harshal@cluster0.d4dxof3.mongodb.net/curebharat';

const updates = [
  { name: 'HJ Finance', memberId: 'CB-HCM-1001', joinDate: '2026-04-17T00:00:00Z', saleCustName: 'HJ Finance' },
  { name: 'Nirmish', memberId: 'CB-HCM-1002', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Nirmish' },
  { name: 'Punit Sata', memberId: 'CB-HCM-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Punit Sata' },
  { name: 'Jaysukhbhai Sonchhatra', memberId: 'CB-HCC-1000', joinDate: '2026-04-21T00:00:00Z', saleCustName: 'Jaysukhbhai Sonchhatra' },
  { name: 'Vijay Makwana', memberId: 'CB-HCC-1001', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Vijay Makwana' },
  { name: 'Amit Mishra', memberId: 'CB-HCM-1003', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Amit Mishra' },
  { name: 'Mayur Karia', memberId: 'CB-HCC-1002', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Mayur Karia' },
  { name: 'Karan Miyatra', memberId: 'CB-HCC-1003', joinDate: '2026-04-23T00:00:00Z', saleCustName: 'Karan Miyatra' },
  { name: 'Siddharth Shrivastava', memberId: 'CB-HCM-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava' },
  { name: 'Siddharth Shrivastava- Self', memberId: 'CB-HCC-1004', joinDate: '2026-04-22T00:00:00Z', saleCustName: 'Siddharth Shrivastava- Self' },
  { name: 'Neeraj Gupta- Self', memberId: 'CB-HCC-1005', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Neeraj Gupta- Self' },
  { name: 'Lavish Kulkarni- Self', memberId: 'CB-HCC-1006', joinDate: '2026-04-27T00:00:00Z', saleCustName: 'Lavish Kulkarni- Self' },
  { name: 'Karan Miyatra', memberId: 'CB-HCC-1007', joinDate: '2026-05-15T00:00:00Z', saleCustName: 'Karan Miyatra' },
  { name: 'Kapil Dube- Self', memberId: 'CB-HCC-1008', joinDate: '2026-05-21T00:00:00Z', saleCustName: 'Kapil Dube- Self' },
];

async function run() {
  const testConn = await mongoose.createConnection(TEST_URI).asPromise();
  const cureConn = await mongoose.createConnection(CURE_URI).asPromise();

  console.log('Connected to both DBs');

  const testSales = await testConn.collection('sales').find().toArray();
  console.log(`Found ${testSales.length} sales in test DB.`);

  for (const sale of testSales) {
    // find memberId
    const mapObj = updates.find(u => u.saleCustName.toLowerCase() === sale.customerName.toLowerCase());
    let memberId = mapObj ? mapObj.memberId : `CB-HCC-${Math.floor(1000 + Math.random()*9000)}`;
    let role = memberId.includes('HCM') ? 'hcm' : (memberId.includes('HBA') ? 'hba' : 'hcc');
    let rank = role.toUpperCase();
    
    // Copy sale
    const existingSale = await cureConn.collection('sales').findOne({ policyId: sale.policyId });
    if (!existingSale) {
      await cureConn.collection('sales').insertOne(sale);
    }
    
    // Create user
    let mobile = sale.customerMobile || `99${Math.floor(10000000 + Math.random()*90000000)}`;
    
    // special case for admin?
    if (mobile === '9689509651') {
      role = 'admin';
      rank = 'ADMIN';
    }

    const existingUser = await cureConn.collection('users').findOne({ mobile });
    if (!existingUser) {
      await cureConn.collection('users').insertOne({
        name: sale.customerName,
        mobile: mobile,
        email: sale.customerEmail || '',
        password: 'password123',
        role: role,
        rank: rank,
        memberId: memberId,
        referrerId: sale.sellerId || null,
        status: 'active',
        createdAt: sale.createdAt || new Date(),
        updatedAt: new Date()
      });
      console.log(`Restored user: ${sale.customerName} (${mobile})`);
    } else {
      console.log(`User already exists: ${sale.customerName} (${mobile})`);
    }
  }

  console.log('Done restoring users and sales to curebharat DB!');
  process.exit(0);
}

run();
