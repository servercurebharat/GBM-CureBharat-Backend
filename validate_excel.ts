import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'C:\\Users\\harsh\\Downloads\\CureBharat_Referral_Links (1).xlsx';

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

const headers = data[0];
if (!headers) {
  console.log('Sheet is empty or has no headers.');
  process.exit(1);
}

let errors = 0;
let checked = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  
  const memberId = row[0]; // Assuming first column is Member ID
  
  for (let j = 3; j < headers.length; j++) { // Assuming links start at column index 3 (after ID, Name, Role)
    const link = row[j];
    if (!link) continue;
    
    const headerName = headers[j]; // e.g., "PlanName (Customer)"
    const typeExpected = headerName.toLowerCase().includes('customer') ? 'customer' : 
                         headerName.toLowerCase().includes('distributor') ? 'distributor' : null;
                         
    if (!typeExpected) continue;

    const match = link.match(/ref_([a-zA-Z0-9_-]+)/);
    if (!match) {
      console.log(`Row ${i+1}, Col ${j+1}: Invalid link format -> ${link}`);
      errors++;
      continue;
    }
    
    const encoded = match[1];
    let decoded;
    try {
      // pad base64 string
      const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
      decoded = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
      const payload = JSON.parse(decoded);
      
      if (payload.m !== memberId) {
        console.log(`Row ${i+1}, Col ${j+1}: Mismatch Member ID. Expected ${memberId}, got ${payload.m}`);
        errors++;
      }
      if (payload.t !== typeExpected) {
        console.log(`Row ${i+1}, Col ${j+1}: Mismatch Type. Expected ${typeExpected}, got ${payload.t}`);
        errors++;
      }
      checked++;
    } catch (e: any) {
      console.log(`Row ${i+1}, Col ${j+1}: Failed to decode link -> ${e.message}`);
      errors++;
    }
  }
}

if (errors === 0) {
  console.log(`Successfully checked ${checked} links. All links are perfectly correct!`);
} else {
  console.log(`Found ${errors} errors while checking ${checked} links.`);
}
process.exit(0);
