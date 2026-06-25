const mongoose = require('mongoose');
const URI = 'mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0';

const planSchema = new mongoose.Schema({ name: String });
const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

const saleSchema = new mongoose.Schema({ plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }, policyId: String });
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

async function run() {
  await mongoose.connect(URI);
  // Switch to curebharat
  const db = mongoose.connection.useDb('curebharat');
  
  const PlanCure = db.model('Plan', planSchema);
  const SaleCure = db.model('Sale', saleSchema);
  
  const sales = await SaleCure.find({ sellerId: '6a3bd7d6286cb84c196874e0' }).populate('plan').lean();
  for (let s of sales) {
     console.log(`Policy: ${s.policyId} | Plan Object:`, s.plan ? s.plan.name : "NULL");
  }
  
  process.exit(0);
}

run();
