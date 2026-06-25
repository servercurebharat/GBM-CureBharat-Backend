const xlsx = require('xlsx');

function analyze() {
  const filePath = 'C:\\Users\\harsh\\Documents\\curebharat-mlm\\CureBharat- Customer Data (2).xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const targets = data.filter(row => {
    const first = (row['First Name'] || '').toString().toLowerCase();
    return first.includes('himmatbhai') || first.includes('mayur') || first.includes('anandkumar') || first.includes('hirva');
  });

  targets.forEach(t => {
     console.log("-----------------------");
     console.log("Name:", t['First Name'], t['Last Name']);
     console.log("Plan Name:", t['Plan Name']);
     console.log("Amount:", t['Plan Amount']);
  });
}

analyze();
