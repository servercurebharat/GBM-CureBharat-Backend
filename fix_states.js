const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Sale = require('./dist/models/Sale').default;
  const res = await Sale.updateMany(
    { 
      $or: [
        { customerState: { $exists: false } }, 
        { customerState: null }, 
        { customerState: '' }
      ] 
    }, 
    { $set: { customerState: 'Maharashtra' } }
  );
  console.log('Updated:', res);
  process.exit(0);
}).catch(console.error);
