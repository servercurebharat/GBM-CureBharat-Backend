import * as XLSX from 'xlsx';
import fs from 'fs';
import mongoose from 'mongoose';
import User from './src/models/User';
import Plan from './src/models/Plan';
import dotenv from 'dotenv';
dotenv.config();

const filePath = 'C:\\Users\\harsh\\Downloads\\CureBharat_Referral_Links (1).xlsx';

async function updateExcel() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/curebharat');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  const headers = data[0];

  const plans = await Plan.find({ isActive: true });

  let updatedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const memberId = row[0]; // First column is Member ID
    if (!memberId) continue;
    
    // For each column starting at index 3 (assuming 0:ID, 1:Name, 2:Role)
    for (let j = 3; j < headers.length; j++) {
      const headerName = headers[j];
      const typeExpected = headerName.toLowerCase().includes('customer') ? 'customer' : 
                           headerName.toLowerCase().includes('distributor') ? 'distributor' : null;
      
      if (!typeExpected) continue;

      // Extract plan name from header (e.g., "Plan Name (Customer)")
      const planNameHeader = headerName.replace(/\s*\((Customer|Distributor)\)/i, '').trim();
      
      // We know `plans.name` in DB might have commas, but in header they were stripped in my script. 
      // But maybe in their file it wasn't my script? Let's try matching.
      const plan = plans.find(p => p.name.replace(/,/g, '').trim() === planNameHeader || p.name.trim() === planNameHeader);
      
      if (!plan) {
         continue;
      }

      // Generate the correct new link with the memberId present in row[0] (which is CB-HCC-1009 for Virendra)
      const payload = JSON.stringify({ m: memberId, p: plan._id.toString(), t: typeExpected });
      const encoded = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const newLink = `https://gbm.curebharat.com/buy/ref_${encoded}`;
      
      if (row[j] !== newLink) {
         row[j] = newLink;
         updatedCount++;
      }
    }
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(data);
  workbook.Sheets[sheetName] = newWorksheet;
  XLSX.writeFile(workbook, filePath);
  
  console.log(`Excel file updated successfully! Corrected ${updatedCount} links.`);
  process.exit(0);
}

updateExcel().catch(err => {
  console.error(err);
  process.exit(1);
});
