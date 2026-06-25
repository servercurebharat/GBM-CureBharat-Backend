const mongoose = require('mongoose');

const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const db = mongoose.connection.client.db('curebharat');
  
  // Mapping of customerName (regex) -> who the ACTUAL SELLER should be
  const saleMap = [
    { customer: /Hirva/i, seller: 'HJ Finance' },
    { customer: /Nirmish/i, seller: 'Punit Sata' },
    { customer: /Punit/i, seller: 'Punit Sata' },
    { customer: /Jaysukhbhai/i, seller: 'Jaysukhbhai Sonchhatra' },
    { customer: /Vijay Makwana/i, seller: 'Vijay Makwana' },
    { customer: /Amit Mishra/i, seller: 'Amit Mishra' },
    { customer: /Kalyani/i, seller: 'HJ Finance' },
    { customer: /Mayur/i, seller: 'Mayur Karia' },
    { customer: /Karan/i, seller: 'Karan Miyatra' },
    { customer: /YAGNIK/i, seller: 'Karan Miyatra' },
    { customer: /Siddharth/i, seller: 'Siddharth Shrivastava' },
    { customer: /Neeraj/i, seller: 'Neeraj Gupta' },
    { customer: /Lavish/i, seller: 'Lavish Kulkarni' },
    { customer: /Kapil/i, seller: 'Kapil Dube' },
    { customer: /Himmatbhai/i, seller: 'Karan Miyatra' },
    { customer: /Anandkumar/i, seller: 'Anandkumar kalal' },
    { customer: /Abhay/i, seller: 'Abhay Sonchhatra' } 
  ];

  const users = await db.collection('users').find().toArray();

  for (const m of saleMap) {
    const sale = await db.collection('sales').findOne({ customerName: m.customer });
    if (sale) {
      const sellerUser = users.find(u => new RegExp(m.seller, 'i').test(u.name));
      if (sellerUser) {
        await db.collection('sales').updateOne(
          { _id: sale._id },
          { $set: { sellerId: sellerUser._id, sellerMemberId: sellerUser.memberId } }
        );
        console.log(`CureBharat DB: Mapped Sale ${sale.customerName} to Seller ${sellerUser.name}`);
      }
    }
  }

  process.exit(0);
});
