import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { processCommission } from './src/lib/commission';
import Sale from './src/models/Sale';
import User from './src/models/User';
import Wallet from './src/models/Wallet';
import './src/models/Plan';
import './src/models/Config';

async function runDb(dbName: string) {
  console.log(`\n=== Reprocessing ${dbName} with correct plans ===`);
  const uri = `mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/${dbName}?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0`;
  
  const conn = await mongoose.createConnection(uri).asPromise();
  
  const WalletModel = conn.model('Wallet', Wallet.schema);
  const SaleModel = conn.model('Sale', Sale.schema);
  const UserModel = conn.model('User', User.schema);

  // 1. Delete old wallets
  await WalletModel.deleteMany({});
  console.log('Deleted all old wallets');

  // 2. Recreate empty wallets
  const users = await UserModel.find({});
  for (const user of users) {
    await WalletModel.create({
      user: user._id,
      provisionalBalance: 0,
      finalBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      ledger: []
    });
  }
  
  // 3. Reset sales
  await SaleModel.updateMany({}, { $set: { commissionProcessed: false } });

  // 4. Reprocess sales
  const sales = await SaleModel.find({});
  let count = 0;
  
  // We need to temporarily mock mongoose models because processCommission uses default connection
  // Actually, wait, it's easier to just run process_all_sales.ts for both databases!
  // I will just use this script to reset the flags, then exit.
}

async function run() {
  const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';
  await mongoose.connect(URI);
  
  const testDb = mongoose.connection.client.db('test');
  const cureDb = mongoose.connection.client.db('curebharat');
  
  await testDb.collection('wallets').deleteMany({});
  await cureDb.collection('wallets').deleteMany({});
  
  const testUsers = await testDb.collection('users').find({}).toArray();
  for(const u of testUsers) await testDb.collection('wallets').insertOne({ user: u._id, provisionalBalance:0, finalBalance:0, totalEarned:0, totalWithdrawn:0, ledger:[] });
  
  const cureUsers = await cureDb.collection('users').find({}).toArray();
  for(const u of cureUsers) await cureDb.collection('wallets').insertOne({ user: u._id, provisionalBalance:0, finalBalance:0, totalEarned:0, totalWithdrawn:0, ledger:[] });

  await testDb.collection('sales').updateMany({}, { $set: { commissionProcessed: false } });
  await cureDb.collection('sales').updateMany({}, { $set: { commissionProcessed: false } });

  console.log('Reset wallets and sales flags for both databases!');
  process.exit(0);
}

run();
