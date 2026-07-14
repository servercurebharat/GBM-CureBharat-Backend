const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://harshladukar:harshal@cluster0.d4dxof3.mongodb.net/curebharat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const saleSchema = new mongoose.Schema({}, { strict: false });
const Sale = mongoose.model('Sale', saleSchema, 'sales');

async function check() {
  const sale = await Sale.findOne({ policyId: 'AA2817' });
  console.log('By policyId AA2817:', !!sale);

  const sale2 = await Sale.findOne({ customerMobile: 'AA2817' });
  console.log('By customerMobile AA2817:', !!sale2);
  
  const anySale = await Sale.findOne();
  console.log('Sample policyId:', anySale?.policyId);

  mongoose.connection.close();
}

check().catch(console.error);
