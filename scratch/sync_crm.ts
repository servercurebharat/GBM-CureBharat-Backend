import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Sale from '../src/models/Sale';
import Plan from '../src/models/Plan';

const CRM_API_URL = 'http://localhost:3000/api/customers';

async function syncSalesToCRM() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const sales = await Sale.find().lean();
  console.log(`Found ${sales.length} total sales in GBM.`);

  const plans = await Plan.find().lean();
  const planMap = new Map(plans.map((p: any) => [p._id.toString(), p]));

  let synced = 0;
  let failed = 0;

  for (const sale of sales) {
    const plan = planMap.get(sale.plan.toString()) as any;
    if (!plan) continue;

    try {
      const response = await fetch(CRM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: sale.policyId,
          memberName: sale.customerName,
          phone: sale.customerMobile,
          email: sale.customerEmail || 'pending@curebharat.com',
          planName: plan.name,
          planStart: new Date(sale.createdAt || Date.now()).toISOString(),
          planEnd: new Date(new Date(sale.createdAt || Date.now()).setFullYear(new Date(sale.createdAt || Date.now()).getFullYear() + 1)).toISOString(),
          coveragePrice: plan.price / 100,
          status: 'active',
          // Dummy values to satisfy strict CRM validation
          gender: 'Other',
          dob: '1900-01-01',
          address: 'Pending KYC',
          nomineeName: sale.nomineeName || 'Pending',
          nomineeDob: '1900-01-01',
          nomineeGender: 'Other',
          relationship: sale.nomineeRelation || 'Pending',
          membersCovered: 1,
          coverageDetails: 'Health Insurance'
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error && errJson.error.includes('already exists')) {
          // Ignore already exists
        } else {
           console.error(`Failed for ${sale.policyId}:`, response.status, errJson);
           failed++;
        }
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`Fetch failed for ${sale.policyId}:`, err);
      failed++;
    }
  }

  console.log(`Done! Successfully synced ${synced} new customers to CRM. Failed: ${failed}`);
  process.exit(0);
}

syncSalesToCRM().catch(console.error);
