import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  role: 'admin' | 'sh' | 'hba' | 'hcm' | 'hcc';
  rank: 'HCC' | 'HCM' | 'HBA' | 'SH' | 'ADMIN';
  memberId: string; // Unique Member ID like CB-HCC-1001
  referrer?: mongoose.Types.ObjectId; // Who recruited this person
  state?: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  status: 'active' | 'inactive' | 'blocked';
  personalSalesCount: number;
  personalSalesThisMonth: number;
  teamSize: number;
  lastSaleDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },
    password: { type: String },
    role: { type: String, enum: ['admin', 'sh', 'hba', 'hcm', 'hcc'], default: 'hcc' },
    rank: { type: String, enum: ['HCC', 'HCM', 'HBA', 'SH', 'ADMIN'], default: 'HCC' },
    memberId: { type: String, unique: true, required: true },
    referrer: { type: Schema.Types.ObjectId, ref: 'User' },
    state: { type: String },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'not_submitted'], default: 'not_submitted' },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    personalSalesCount: { type: Number, default: 0 },
    personalSalesThisMonth: { type: Number, default: 0 },
    teamSize: { type: Number, default: 0 },
    lastSaleDate: { type: Date },
  },
  { timestamps: true }
);

// Prevent model recompilation in Next.js HMR
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
