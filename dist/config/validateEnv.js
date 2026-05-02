"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'PORT',
    'FRONTEND_URL'
];
function validateEnv() {
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Missing required env variables: ${missing.join(', ')}`);
        process.exit(1);
    }
    console.log('✅ Environment variables validated');
}
