import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'dukua47wj',
  api_key: '656661398134983',
  api_secret: 'R5-3L18aaKkhfx02p5qfJHywQ4c'
});

async function run() {
  try {
    const result = await cloudinary.api.usage();
    console.log("=== CLOUDINARY USAGE ===");
    console.log(`Plan: ${result.plan}`);
    console.log(`Total Resources (Images/Files): ${result.resources}`);
    console.log(`Bandwidth Usage: ${result.bandwidth.usage} / ${result.bandwidth.limit} (${(result.bandwidth.usage / result.bandwidth.limit * 100).toFixed(2)}%)`);
    console.log(`Storage Usage: ${result.storage.usage} / ${result.storage.limit} (${(result.storage.usage / result.storage.limit * 100).toFixed(2)}%)`);
    
    console.log("\n=== FOLDERS ===");
    const folders = await cloudinary.api.root_folders();
    for (const folder of folders.folders) {
      console.log(`- ${folder.name}`);
    }

  } catch (error) {
    console.error(error);
  }
}

run();
