import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;
  const Plan = require('./src/models/Plan').default;

  const users = await User.find({ status: { $ne: 'blocked' } }).sort({ createdAt: 1 });
  const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

  let csv = 'Member Name,Member ID,Role,Rank,';
  plans.forEach((p: any) => {
    csv += `"${p.name} Link",`;
  });
  csv += '\n';

  users.forEach((user: any) => {
    if (!user.memberId) return;
    csv += `"${user.name}","${user.memberId}","${user.role}","${user.rank}",`;
    plans.forEach((p: any) => {
      const link = `https://gbm.curebharat.com/buy/${user.memberId}?planId=${p._id}`;
      csv += `"${link}",`;
    });
    csv += '\n';
  });

  fs.writeFileSync('member_referral_links.csv', csv);
  console.log('Generated member_referral_links.csv');

  // Also generate a markdown for artifact
  let md = '| Member Name | Member ID | Role | Rank |';
  plans.forEach((p: any) => {
    md += ` ${p.name} |`;
  });
  md += '\n|---|---|---|---|';
  plans.forEach(() => { md += '---|'; });
  md += '\n';

  users.forEach((user: any) => {
    if (!user.memberId) return;
    md += `| ${user.name} | ${user.memberId} | ${user.role} | ${user.rank} |`;
    plans.forEach((p: any) => {
      const link = `https://gbm.curebharat.com/buy/${user.memberId}?planId=${p._id}`;
      md += ` [Link](${link}) |`;
    });
    md += '\n';
  });
  fs.writeFileSync('member_referral_links.md', md);

  process.exit(0);
}

run().catch(console.error);
