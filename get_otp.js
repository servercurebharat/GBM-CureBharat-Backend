const mongoose = require('mongoose');

const uri = "mongodb://harshladukar:harshal@ac-qogdafi-shard-00-00.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-01.d4dxof3.mongodb.net:27017,ac-qogdafi-shard-00-02.d4dxof3.mongodb.net:27017/?ssl=true&replicaSet=atlas-uwympq-shard-0&authSource=admin&appName=Cluster0";

const otpSchema = new mongoose.Schema({}, { strict: false });
const OTP = mongoose.model('OTP', otpSchema);

async function getOTP() {
  try {
    await mongoose.connect(uri);
    const record = await OTP.findOne({ email: 'dummyhcc@example.com' });
    if (record) {
      console.log("Found OTP for dummyhcc@example.com:", record.otp);
    } else {
      console.log("No OTP found for dummyhcc@example.com");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

getOTP();
