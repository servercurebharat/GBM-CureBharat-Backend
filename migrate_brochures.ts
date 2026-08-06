import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: 'dg7ofm2ku',
  api_key: '619139293115161',
  api_secret: 'jjVJZgHnJQZkzlRsx-nwTvkC1dE'
});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  // Using mongoose.models if it exists, otherwise require
  const Plan = require('./src/models/Plan').default;

  const basePath = "C:\\Users\\harsh\\Downloads\\Curebharat Templates\\Curebharat Templates";
  
  // Mapping of folder names to the plan name regex in DB
  const folderToPlanMap = {
    "Sampoorna Suraksha Plus": "PLUS",
    "Sampoorna Suraksha Premium": "PREMIUM",
    "Sampoorna Suraksha Super": "SAMPOORNA", // Might be just Sampoorna Suraksha 2999
    "Super Suraksha": "SUPER SURAKSHA",
    "Suraksha Special": "SPECIAL"
  };

  const folders = fs.readdirSync(basePath);
  
  for (const folder of folders) {
    const fullPath = path.join(basePath, folder);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    
    console.log(`\nProcessing folder: ${folder}`);
    
    // Find the corresponding plan
    let planKeyword = (folderToPlanMap as any)[folder] || folder;
    let query = { name: { $regex: new RegExp(planKeyword, 'i') } };
    
    if (folder === "Sampoorna Suraksha Super") {
        query = { name: { $regex: /CB-SAMPOORNA SURAKSHA$/i } } as any; // EXACT MATCH for 2999 plan
    }

    const plan = await Plan.findOne(query);
    if (!plan) {
      console.log(`  -> Plan not found in DB for keyword: ${planKeyword}`);
      continue;
    }
    console.log(`  -> Matched Plan: ${plan.name} (${plan._id})`);

    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.pdf'));
    const brochures: { language: string, url: string }[] = [];

    for (const file of files) {
      console.log(`    -> Found PDF: ${file}`);
      let language = "English";
      if (file.toLowerCase().includes('hindi')) language = "Hindi";
      else if (file.toLowerCase().includes('marathi')) language = "Marathi";
      else if (file.toLowerCase().includes('gujrati')) language = "Gujarati";

      const filePath = path.join(fullPath, file);
      
      console.log(`      -> Uploading as ${language}...`);
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: 'image', // For PDFs to render properly inline
          folder: 'curebharat/brochures'
        });
        
        console.log(`      -> Uploaded successfully: ${result.secure_url}`);
        brochures.push({
          language,
          url: result.secure_url
        });
      } catch (uploadErr) {
        console.error(`      -> Upload failed:`, uploadErr);
      }
    }

    if (brochures.length > 0) {
      plan.brochures = brochures;
      // Keep english as fallback in brochureUrl
      const englishBrochure = brochures.find(b => b.language === "English") || brochures[0];
      plan.brochureUrl = englishBrochure.url;
      
      await plan.save();
      console.log(`  -> Plan updated with ${brochures.length} brochures.`);
    }
  }

  console.log("\nMigration complete!");
  process.exit(0);
}

run().catch(console.error);
