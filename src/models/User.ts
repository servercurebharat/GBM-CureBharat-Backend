import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

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
  gender?: 'male' | 'female' | 'other';
  dob?: Date;
  profileImage?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
  };
  nomineeDetails?: {
    name?: string;
    relation?: string;
    mobile?: string;
    dob?: Date;
    gender?: string;
  };
  maritalStatus?: string;
  occupation?: string;
  alternateMobile?: string;
  familyDetails?: Array<{
    name: string;
    relation: string;
    dob: Date;
    gender: string;
  }>;
  healthDetails?: {
    existingMedicalConditions?: string;
    currentMedications?: string;
    lifestyle?: string;
  };
  kycDocuments?: {
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    panNumber?: string;
    panUrl?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    bankProofUrl?: string;
    selfieUrl?: string;
  };
  personalSalesCount: number;
  personalSalesThisMonth: number;
  personalRecruitsThisMonth: number;
  lastActiveMonth?: string;
  teamSize: number;
  joiningDate: Date;
  lastLoginIP?: string;
  lastLoginAt?: Date;
  totalTimeSpent: number; // in seconds
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
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  profileImage: { type: String },
  address: {
    addressLine1: String,
    addressLine2: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branchName: String,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  },
  nomineeDetails: {
    name: String,
    relation: String,
    mobile: String,
    dob: Date,
    gender: String,
  },
  maritalStatus: String,
  occupation: String,
  alternateMobile: String,
  familyDetails: [{
    name: String,
    relation: String,
    dob: Date,
    gender: String,
  }],
  healthDetails: {
    existingMedicalConditions: String,
    currentMedications: String,
    lifestyle: String,
  },
  kycDocuments: {
    aadhaarNumber: String,
    aadhaarFrontUrl: String,
    aadhaarBackUrl: String,
    panNumber: String,
    panUrl: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    bankProofUrl: String,
    selfieUrl: String,
  },
  personalSalesCount: { type: Number, default: 0 },
  personalSalesThisMonth: { type: Number, default: 0 },
  personalRecruitsThisMonth: { type: Number, default: 0 },
  lastActiveMonth: { type: String }, // YYYY-MM
  teamSize: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  lastLoginIP: { type: String },
  lastLoginAt: { type: Date },
  totalTimeSpent: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ referrerId: 1 });

// Pre-save hook to hash password automatically
userSchema.pre('save', async function (next) {
  const user = this as any;
  if (!user.isModified('password')) return next();

  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    } catch (err: any) {
      return next(err);
    }
  }
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
