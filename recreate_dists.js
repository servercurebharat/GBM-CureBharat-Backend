const fs = require('fs');
const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  
  const files = fs.readdirSync('src').filter(f => f.startsWith('seed') && !f.includes('hierarchy') && !f.includes('sales') && !f.includes('sanskar'));
  
  for (let f of files) {
    const content = fs.readFileSync('src/' + f, 'utf8');
    
    // Attempt to extract mobile
    const mobileMatch = content.match(/mobile\s*=\s*['"](\d+)['"]/);
    if (!mobileMatch) continue;
    const mobile = mobileMatch[1];
    
    // Try to extract name
    const nameMatch = content.match(/name:\s*['"](.*?)['"]/);
    const name = nameMatch ? nameMatch[1] : f.replace('seed', '').replace('.ts', '');
    
    // Try to extract memberId or role
    let memberId = 'CB-HCC-' + Math.floor(1000 + Math.random()*9000);
    
    // Let's hardcode the ones we know from update_db.ts
    if (f === 'seedHJFinance.ts') memberId = 'CB-HCM-1001'; 
    if (f === 'seedAnandkumar.ts') memberId = 'CB-HCC-1001';
    if (f === 'seedJaysukhbhai.ts') memberId = 'CB-HCC-1000';
    if (f === 'seedKapil.ts') memberId = 'CB-HCC-1008';
    if (f === 'seedKaran.ts') memberId = 'CB-HCC-1003';
    if (f === 'seedLavish.ts') memberId = 'CB-HCC-1006';
    if (f === 'seedMayur.ts') memberId = 'CB-HCC-1002';
    if (f === 'seedNeeraj.ts') memberId = 'CB-HCC-1005';
    if (f === 'seedSiddharth.ts') memberId = 'CB-HCM-1004';
    if (f === 'seedVijay.ts') memberId = 'CB-HCC-1011'; 
    if (f === 'seedAmit.ts') memberId = 'CB-HCM-1003';
    
    // If it's Punit Sata, he's HBA
    if (name.includes('Punit') || f.includes('HJ')) memberId = 'CB-HBA-1000'; 
    if (content.includes('CB-HCM-1001')) memberId = 'CB-HCM-1001';
    if (content.includes('CB-HBA-1000')) memberId = 'CB-HBA-1000';

    let role = memberId.includes('HBA') ? 'hba' : (memberId.includes('HCM') ? 'hcm' : 'hcc');
    
    try {
      await db.collection('users').updateOne(
        { mobile: mobile },
        { $set: { 
            name: name,
            mobile: mobile,
            email: mobile + '@curebharat.dummy',
            role: role,
            rank: role.toUpperCase(),
            memberId: memberId,
            status: 'active',
            state: 'Gujarat',
            password: 'password123',
            createdAt: new Date()
        } },
        { upsert: true }
      );
      console.log(`Created/Updated: ${name} (${mobile}) as ${memberId}`);
    } catch(err) {
      if (err.code === 11000) {
        memberId = memberId + 'X';
        await db.collection('users').updateOne(
          { mobile: mobile },
          { $set: { 
              name: name,
              mobile: mobile,
              email: mobile + '@curebharat.dummy',
              role: role,
              rank: role.toUpperCase(),
              memberId: memberId,
              status: 'active',
              state: 'Gujarat',
              password: 'password123',
              createdAt: new Date()
          } },
          { upsert: true }
        );
        console.log(`Created/Updated (duplicate fixed): ${name} (${mobile}) as ${memberId}`);
      } else {
        console.log(err.message);
      }
    }
  }
  
  console.log('Done recreating distributors!');
  process.exit(0);
});
