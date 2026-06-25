const xlsx = require('xlsx');

function analyze() {
  const filePath = 'C:\\Users\\harsh\\Documents\\curebharat-mlm\\CureBharat- Customer Data (2).xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`Total rows: ${data.length}`);
  if (data.length > 0) {
     console.log("Column Keys:", Object.keys(data[0]));
     console.log("First Row:", data[0]);
  }
}

analyze();
