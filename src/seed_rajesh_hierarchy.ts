import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User';

const MONGO_URI = process.env.MONGODB_URI || '';

async function seedRajeshHierarchy() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Find Rajesh Patel (SH)
  const rajesh = await User.findOne({ memberId: 'CB-SH-0001' });
  if (!rajesh) {
    console.error('❌ Rajesh Patel (CB-SH-0001) not found!');
    process.exit(1);
  }
  console.log(`✅ Found Rajesh Patel: ${rajesh._id}`);

  const hashedPwd = await bcrypt.hash('password123', 10);

  // ============================================================
  // LEVEL 1: 3 HBAs directly under Rajesh
  // ============================================================
  const hbaData = [
    { name: 'Anand Sharma',   mobile: '9100000011', memberId: 'CB-HBA-R1', state: 'Maharashtra' },
    { name: 'Mohit Gupta',    mobile: '9100000012', memberId: 'CB-HBA-R2', state: 'Maharashtra' },
    { name: 'Ritu Agarwal',   mobile: '9100000013', memberId: 'CB-HBA-R3', state: 'Maharashtra' },
  ];

  const hbas: any[] = [];
  for (const d of hbaData) {
    const existing = await User.findOne({ memberId: d.memberId });
    if (existing) {
      console.log(`⚠️  Skipping ${d.memberId} (already exists)`);
      hbas.push(existing);
      continue;
    }
    const hba = await User.create({
      name: d.name,
      mobile: d.mobile,
      password: hashedPwd,
      role: 'hba',
      memberId: d.memberId,
      state: d.state,
      referrerId: rajesh._id,  // Reports to Rajesh (SH)
      shId: rajesh._id,
      status: 'active',
      kycStatus: 'approved',
    });
    hbas.push(hba);
    console.log(`✅ Created HBA: ${d.name} (${d.memberId}) → under Rajesh`);
  }

  // ============================================================
  // LEVEL 2: 3 HCMs — one under each HBA
  // ============================================================
  const hcmData = [
    { name: 'Deepak Verma',   mobile: '9100000021', memberId: 'CB-HCM-R1', state: 'Maharashtra', hbaIndex: 0 },
    { name: 'Kavita Nair',    mobile: '9100000022', memberId: 'CB-HCM-R2', state: 'Maharashtra', hbaIndex: 1 },
    { name: 'Pooja Mishra',   mobile: '9100000023', memberId: 'CB-HCM-R3', state: 'Maharashtra', hbaIndex: 2 },
  ];

  const hcms: any[] = [];
  for (const d of hcmData) {
    const parentHBA = hbas[d.hbaIndex];
    const existing = await User.findOne({ memberId: d.memberId });
    if (existing) {
      console.log(`⚠️  Skipping ${d.memberId} (already exists)`);
      hcms.push(existing);
      continue;
    }
    const hcm = await User.create({
      name: d.name,
      mobile: d.mobile,
      password: hashedPwd,
      role: 'hcm',
      memberId: d.memberId,
      state: d.state,
      referrerId: parentHBA._id,  // Reports to HBA
      hbaId: parentHBA._id,
      shId: rajesh._id,
      status: 'active',
      kycStatus: 'approved',
    });
    hcms.push(hcm);
    console.log(`✅ Created HCM: ${d.name} (${d.memberId}) → under ${parentHBA.name}`);
  }

  // ============================================================
  // LEVEL 3: 4 HCCs — spread across HCMs
  // ============================================================
  const hccData = [
    { name: 'Rahul Singh',    mobile: '9100000031', memberId: 'CB-HCC-R1', state: 'Maharashtra', hcmIndex: 0 },
    { name: 'Priyanka Das',   mobile: '9100000032', memberId: 'CB-HCC-R2', state: 'Maharashtra', hcmIndex: 0 },
    { name: 'Suresh Iyer',    mobile: '9100000033', memberId: 'CB-HCC-R3', state: 'Maharashtra', hcmIndex: 1 },
    { name: 'Anil Joshi',     mobile: '9100000034', memberId: 'CB-HCC-R4', state: 'Maharashtra', hcmIndex: 1 },
    { name: 'Lokesh Tiwari',  mobile: '9100000035', memberId: 'CB-HCC-R5', state: 'Maharashtra', hcmIndex: 2 },
    { name: 'Swati Verma',    mobile: '9100000036', memberId: 'CB-HCC-R6', state: 'Maharashtra', hcmIndex: 2 },
    { name: 'Kiran Bhat',     mobile: '9100000037', memberId: 'CB-HCC-R7', state: 'Maharashtra', hcmIndex: 2 },
  ];

  for (const d of hccData) {
    const parentHCM = hcms[d.hcmIndex];
    const parentHBA = hbas[hcmData[d.hcmIndex].hbaIndex];
    const existing = await User.findOne({ memberId: d.memberId });
    if (existing) {
      console.log(`⚠️  Skipping ${d.memberId} (already exists)`);
      continue;
    }
    await User.create({
      name: d.name,
      mobile: d.mobile,
      password: hashedPwd,
      role: 'hcc',
      memberId: d.memberId,
      state: d.state,
      referrerId: parentHCM._id,  // Reports to HCM
      hcmId: parentHCM._id,
      hbaId: parentHBA._id,
      shId: rajesh._id,
      status: 'active',
      kycStatus: 'approved',
    });
    console.log(`✅ Created HCC: ${d.name} (${d.memberId}) → under ${parentHCM.name} → ${parentHBA.name} → Rajesh`);
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n🎉 ============================================');
  console.log('   HIERARCHY BUILT UNDER RAJESH PATEL (SH)');
  console.log('===============================================');
  console.log('Rajesh Patel (CB-SH-0001)');
  console.log('├── Anand Sharma (CB-HBA-R1)');
  console.log('│   ├── Deepak Verma (CB-HCM-R1)');
  console.log('│   │   ├── Rahul Singh (CB-HCC-R1)');
  console.log('│   │   └── Priyanka Das (CB-HCC-R2)');
  console.log('├── Mohit Gupta (CB-HBA-R2)');
  console.log('│   ├── Kavita Nair (CB-HCM-R2)');
  console.log('│   │   ├── Suresh Iyer (CB-HCC-R3)');
  console.log('│   │   └── Anil Joshi (CB-HCC-R4)');
  console.log('└── Ritu Agarwal (CB-HBA-R3)');
  console.log('    └── Pooja Mishra (CB-HCM-R3)');
  console.log('        ├── Lokesh Tiwari (CB-HCC-R5)');
  console.log('        ├── Swati Verma (CB-HCC-R6)');
  console.log('        └── Kiran Bhat (CB-HCC-R7)');
  console.log('===============================================');
  console.log('Total new users: 13 (3 HBA + 3 HCM + 7 HCC)');

  await mongoose.disconnect();
  console.log('✅ Done!');
}

seedRajeshHierarchy().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
