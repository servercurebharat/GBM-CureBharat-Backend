const xlsx = require('xlsx');

function analyze() {
  const filePath = 'C:\\Users\\harsh\\Documents\\curebharat-mlm\\CureBharat- Customer Data (2).xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Total rows: ${data.length}`);
  
  // Search for Hirva and Himmatbhai
  const targets = data.filter(row => {
    const name = (row['Customer Name'] || row['Customer_Name'] || row['Name'] || '').toString().toLowerCase();
    const policyId = (row['Policy Id'] || row['Policy ID'] || row['Policy_Id'] || row['Id'] || '').toString();
    return name.includes('hirva') || name.includes('himmatbhai') || policyId.includes('9000') || policyId.includes('9009');
  });

  console.log("Found Targets:");
  targets.forEach(t => {
     console.log("-----------------------");
     console.log("Policy:", t['Policy Id'] || t['Policy ID']);
     console.log("Name:", t['Customer Name'] || t['Customer_Name']);
     console.log("Plan Name:", t['Plan Name'] || t['Plan_Name'] || t['Plan']);
     console.log("Amount:", t['Amount'] || t['Sale Amount'] || t['Price']);
     console.log("Seller:", t['Seller Name'] || t['Seller_Name'] || t['Distributor Name']);
  });
}

analyze();
