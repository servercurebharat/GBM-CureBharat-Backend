import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: { 
    type: String, 
    required: true, 
    index: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: { expires: '5m' } // TTL index: auto-deletes document 5 minutes after expiresAt!
  }
}, { 
  timestamps: true 
});

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', otpSchema);
