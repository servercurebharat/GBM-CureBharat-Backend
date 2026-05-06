import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  role: 'admin' | 'sh' | 'hba' | 'hcm' | 'hcc';
  rank: 'HCC' | 'HCM' | 'HBA' | 'SH' | 'ADMIN';
  memberId: string;
  referrerId?: mongoose.Types.ObjectId;
  state?: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  status: 'active' | 'inactive' | 'blocked';
  personalSalesCount: number;
  personalSalesThisMonth: number;
  teamSize: number;
  lastSaleDate?: Date;
  
  // New Profile Fields
  gender?: 'male' | 'female' | 'other';
  dob?: Date;
  profileImage?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
  };
  nomineeDetails?: {
    name?: string;
    relation?: string;
    mobile?: string;
  };
  kycDocuments?: {
    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    panCard?: string;
    bankProof?: string;
    selfie?: string;
  };
  
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
    referrerId: { type: Schema.Types.ObjectId, ref: 'User' },
    state: { type: String },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'not_submitted'], default: 'not_submitted' },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    personalSalesCount: { type: Number, default: 0 },
    personalSalesThisMonth: { type: Number, default: 0 },
    teamSize: { type: Number, default: 0 },
    lastSaleDate: { type: Date },

    // New Profile Fields
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dob: { type: Date },
    profileImage: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      branchName: String
    },
    nomineeDetails: {
      name: String,
      relation: String,
      mobile: String
    },
    kycDocuments: {
      aadhaarNumber: String,
      panNumber: String,
      aadhaarFront: String,
      aadhaarBack: String,
      panCard: String,
      bankProof: String,
      selfie: String
    }
  },
  { timestamps: true }
);

// Prevent model recompilation in Next.js HMR
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
