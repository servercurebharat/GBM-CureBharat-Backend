import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const User = require('./src/models/User').default;

  const users = await User.find({ status: { $ne: 'blocked' } }).lean();
  
  // Create a map for quick lookup
  const userMap = new Map();
  users.forEach((u: any) => userMap.set(u._id.toString(), u));

  // Find root users (those with no referrerId or referrerId not in our active user list)
  const roots: any[] = [];
  const childrenMap = new Map();

  users.forEach((u: any) => {
    let parentId = u.referrerId ? u.referrerId.toString() : null;
    
    // If the parent doesn't exist in our map (maybe deleted/blocked), treat as root
    if (!parentId || !userMap.has(parentId)) {
      roots.push(u);
    } else {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId).push(u);
    }
  });

  // Function to build markdown tree
  let md = '# CureBharat Network Hierarchy\n\n';
  
  function buildTree(user: any, level: number) {
    const indent = '  '.repeat(level);
    // Format: - **Name** (ID) - [Rank]
    md += `${indent}- **${user.name}** (\`${user.memberId}\`) - [${user.rank}]\n`;
    
    const children = childrenMap.get(user._id.toString()) || [];
    // Sort children by rank or name
    children.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    children.forEach((child: any) => {
      buildTree(child, level + 1);
    });
  }

  // Sort roots to put admins/top-level first
  roots.sort((a, b) => a.name.localeCompare(b.name));

  roots.forEach(root => {
    buildTree(root, 0);
  });

  fs.writeFileSync('member_hierarchy.md', md);
  console.log('Hierarchy generated.');

  process.exit(0);
}

run().catch(console.error);
