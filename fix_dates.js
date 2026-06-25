const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

const datesMap = {
  'CB-POL-178-9000': '2026-04-17T10:00:00.000Z',
  'CB-POL-178-9001': '2026-04-21T10:00:00.000Z',
  'CB-POL-178-9002': '2026-04-21T10:10:00.000Z',
  'CB-POL-178-9003': '2026-04-21T10:20:00.000Z',
  'CB-POL-178-9004': '2026-04-21T10:30:00.000Z',
  'CB-POL-178-9005': '2026-04-22T10:00:00.000Z',
  'CB-POL-178-9006': '2026-04-22T10:10:00.000Z',
  'CB-POL-178-9007': '2026-04-22T10:20:00.000Z',
  'CB-POL-178-9008': '2026-04-23T10:00:00.000Z',
  'CB-POL-178-9009': '2026-04-23T10:10:00.000Z',
  'CB-POL-178-9010': '2026-04-22T10:30:00.000Z',
  'CB-POL-178-9011': '2026-04-27T10:00:00.000Z',
  'CB-POL-178-9012': '2026-04-27T10:10:00.000Z',
  'CB-POL-178-9013': '2026-05-15T10:00:00.000Z',
  'CB-POL-178-9014': '2026-05-21T10:00:00.000Z'
};

async function run() {
  await mongoose.connect(URI);
  const dbTest = mongoose.connection.client.db('test');
  const dbLive = mongoose.connection.client.db('curebharat');
  
  for (let db of [dbTest, dbLive]) {
    for (const [policyId, dateStr] of Object.entries(datesMap)) {
      await db.collection('sales').updateOne(
        { policyId: policyId },
        { $set: { createdAt: new Date(dateStr) } }
      );
    }
    console.log(`Updated dates in ${db.databaseName}`);
  }

  process.exit(0);
}

run();
