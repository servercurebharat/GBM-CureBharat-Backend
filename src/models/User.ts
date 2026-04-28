import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  role: 'admin' | 'sh' | 'hba' | 'hcm' | 'hcc';
  rank: 'ADMIN' | 'SH' | 'HBA' | 'HCM' | 'HCC';
  memberId: string;
  referrerId?: mongoose.Types.ObjectId;
  state: string;
  status: 'active' | 'inactive' | 'blocked';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  kycDocuments?: {
    aadhaarNumber?: string;
    panNumber?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  personalSalesCount: number;
  personalSalesThisMonth: number;
  teamSize: number;
  joiningDate: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  role: { type: String, enum: ['admin', 'sh', 'hba', 'hcm', 'hcc'], default: 'hcc' },
  rank: { type: String, enum: ['ADMIN', 'SH', 'HBA', 'HCM', 'HCC'], default: 'HCC' },
  memberId: { type: String, unique: true },
  referrerId: { type: Schema.Types.ObjectId, ref: 'User' },
  state: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  kycStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'not_submitted'], default: 'not_submitted' },
  kycDocuments: {
    aadhaarNumber: String,
    panNumber: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
  },
  personalSalesCount: { type: Number, default: 0 },
  personalSalesThisMonth: { type: Number, default: 0 },
  teamSize: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ referrerId: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
