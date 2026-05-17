const fs = require('fs');
const filePath = "c:\\Users\\harsh\\Documents\\curebharat-mlm\\MLML_Frontend\\app\\(dashboard)\\admin\\kyc\\page.tsx";
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
for (let i = 194; i <= 214; i++) {
  console.log(`Line ${i + 1}: [${lines[i]}]`);
}
