const xlsx = require('xlsx');
const mongoose = require('mongoose');

const workbook = xlsx.readFile('C:\\Users\\harsh\\Documents\\curebharat-mlm\\CureBharat- Customer Data (2).xlsx');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('test');
  const users = await db.collection('users').find().toArray();
  
  const findUser = (nameStr) => {
    if (!nameStr || nameStr === '-' || nameStr.trim() === '') return null;
    const cleanName = nameStr.replace('- Self', '').trim().toLowerCase();
    return users.find(u => u.name.toLowerCase().includes(cleanName) || cleanName.includes(u.name.toLowerCase()));
  };

  const relationships = [];

  for (const row of data) {
    const hba = row['HBA Name'];
    const hcm = row['HCM Name'];
    const hcc = row['HCC Name'];
    
    if (hcc && hcm && hcc !== '-' && hcm !== '-') {
      relationships.push({ child: hcc, parent: hcm, type: 'HCC -> HCM' });
    }
    if (hcm && hba && hcm !== '-' && hba !== '-') {
      relationships.push({ child: hcm, parent: hba, type: 'HCM -> HBA' });
    }
  }

  // Deduplicate
  const uniqueRels = [...new Set(relationships.map(r => JSON.stringify(r)))].map(r => JSON.parse(r));
  
  console.log('--- FOUND RELATIONSHIPS IN EXCEL ---');
  for (const rel of uniqueRels) {
    console.log(`${rel.child} REPORTS TO ${rel.parent}`);
    
    const childUser = findUser(rel.child);
    const parentUser = findUser(rel.parent);
    
    if (childUser && parentUser) {
      console.log(`  -> MATCHED IN DB: ${childUser.name} (${childUser.memberId}) -> ${parentUser.name} (${parentUser.memberId})`);
      await db.collection('users').updateOne(
        { _id: childUser._id },
        { $set: { referrerId: parentUser._id, sponsor: parentUser._id } }
      );
      console.log('  -> UPDATED DB!');
    } else {
      console.log(`  -> MISSING IN DB! Child: ${!!childUser}, Parent: ${!!parentUser}`);
    }
  }

  console.log('Finished processing relationships!');
  process.exit(0);
});
