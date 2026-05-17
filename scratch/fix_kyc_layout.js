const fs = require('fs');
const filePath = "c:\\Users\\harsh\\Documents\\curebharat-mlm\\MLML_Frontend\\app\\(dashboard)\\admin\\kyc\\page.tsx";
let content = fs.readFileSync(filePath, 'utf8');

const target = `                 <button className="w-full bg-white/10 hover:bg-white/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all">AUDIT LOGS</button>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

              {/* Security Alert */}`;

const replacement = `                 <button className="w-full bg-white/10 hover:bg-white/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all">AUDIT LOGS</button>
              </div>

              {/* Security Alert */}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESSFULLY FIXED!");
} else {
  // Try with \r\n
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacementCRLF);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("SUCCESSFULLY FIXED WITH CRLF!");
  } else {
    console.log("Target not found!");
  }
}
