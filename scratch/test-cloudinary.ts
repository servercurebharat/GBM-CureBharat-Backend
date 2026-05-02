import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  console.log('--- Cloudinary Diagnostic Tool ---');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  
  try {
    console.log('\nStep 1: Attempting test upload to Cloudinary...');
    // Upload a small test image (1x1 transparent pixel)
    const result = await cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', {
      folder: 'diagnostic_tests',
    });
    
    console.log('✅ Upload Success!');
    console.log('URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    
    console.log('\nStep 2: Verifying response structure...');
    if (result.secure_url) {
       console.log('✅ Response structure is compatible with our uploader.');
    } else {
       console.log('❌ Unexpected response structure.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Cloudinary Error:', error.message);
    if (error.http_code === 401) {
      console.error('Hint: Your API Key or Secret might be incorrect.');
    } else if (error.http_code === 400) {
      console.error('Hint: Check your Cloud Name or account status.');
    }
  }
}

testUpload();
