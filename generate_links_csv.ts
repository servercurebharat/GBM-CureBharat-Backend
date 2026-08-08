import mongoose from 'mongoose';
import User from './src/models/User';
import Plan from './src/models/Plan';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function generateLinksSheet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curebharat');
    console.log('Connected to MongoDB');

    const users = await User.find({}).sort({ memberId: 1 });
    const plans = await Plan.find({ isActive: true });

    if (plans.length === 0) {
      console.log('No active plans found.');
      process.exit(0);
    }

    console.log(`Found ${users.length} users and ${plans.length} plans.`);

    let csvContent = 'Member ID,Name,Role';
    plans.forEach((p: any) => {
      const planName = p.name.replace(/,/g, ''); // strip commas just in case
      csvContent += `,${planName} (Customer),${planName} (Distributor)`;
    });
    csvContent += '\n';

    users.forEach((user: any) => {
      let row = `${user.memberId},${user.name?.replace(/,/g, '') || ''},${user.role}`;

      plans.forEach((plan: any) => {
        // Customer Link
        const customerData = JSON.stringify({ m: user.memberId, p: plan._id.toString(), t: 'customer' });
        const customerEncoded = Buffer.from(customerData).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const customerLink = `https://gbm.curebharat.com/buy/ref_${customerEncoded}`;

        // Distributor Link
        const distributorData = JSON.stringify({ m: user.memberId, p: plan._id.toString(), t: 'distributor' });
        const distributorEncoded = Buffer.from(distributorData).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const distributorLink = `https://gbm.curebharat.com/buy/ref_${distributorEncoded}`;

        row += `,${customerLink},${distributorLink}`;
      });

      csvContent += row + '\n';
    });

    const filePath = path.join(process.cwd(), 'Member_Referral_Links.csv');
    fs.writeFileSync(filePath, csvContent);
    console.log(`Successfully generated sheet at: ${filePath}`);

    process.exit(0);
  } catch (err) {
    console.error('Error generating sheet:', err);
    process.exit(1);
  }
}

generateLinksSheet();
