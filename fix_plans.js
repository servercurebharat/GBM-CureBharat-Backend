const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

const plansToCreate = [
  {
    name: 'CureBharat Surksha Special',
    category: 'service',
    price: 149900,
    businessVolume: 49900,
    isCommissionable: true,
    gstPercent: 18,
    description: 'Special onboarding plan',
    isActive: true
  },
  {
    name: 'CureBharat Super Surksha',
    category: 'service',
    price: 199900,
    businessVolume: 99900,
    isCommissionable: true,
    gstPercent: 18,
    description: 'Super Surksha plan',
    isActive: true
  },
  {
    name: 'CureBharat Sampoorna Surksha Premium',
    category: 'service',
    price: 499900,
    businessVolume: 399900,
    isCommissionable: true,
    gstPercent: 18,
    description: 'Premium plan',
    isActive: true
  }
];

async function updateDb(dbName) {
  const db = mongoose.connection.client.db(dbName);

  // Create plans
  for (const p of plansToCreate) {
    const existing = await db.collection('plans').findOne({ name: p.name });
    if (!existing) {
      await db.collection('plans').insertOne(p);
    }
  }

  // Fetch the plans
  const plan1499 = await db.collection('plans').findOne({ name: 'CureBharat Surksha Special' });
  const plan1999 = await db.collection('plans').findOne({ name: 'CureBharat Super Surksha' });
  const plan4999 = await db.collection('plans').findOne({ name: 'CureBharat Sampoorna Surksha Premium' });

  // Update sales
  if (plan1499) {
    await db.collection('sales').updateMany(
      { saleAmount: 149900 },
      { $set: { plan: plan1499._id } }
    );
  }
  if (plan1999) {
    await db.collection('sales').updateMany(
      { saleAmount: 199900 },
      { $set: { plan: plan1999._id } }
    );
  }
  if (plan4999) {
    await db.collection('sales').updateMany(
      { saleAmount: 499900 },
      { $set: { plan: plan4999._id } }
    );
  }

  console.log(`Updated plans beautifully in ${dbName}!`);
}

mongoose.connect(URI).then(async () => {
  try {
    await updateDb('test');
    await updateDb('curebharat');
  } catch(e) {
    console.log(e);
  } finally {
    process.exit(0);
  }
});
