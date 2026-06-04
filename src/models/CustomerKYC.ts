import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerKYC extends Document {
  saleId: mongoose.Types.ObjectId;
  
  // Primary Applicant
  fullName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  occupation: string;
  pan: string;

  // Contact
  mobile: string;
  alternateMobile?: string;
  email: string;

  // Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;

  // Family / Nominees
  familyDetails: Array<{
    name: string;
    relation: string;
    dob: string;
    gender: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const customerKycSchema = new Schema<ICustomerKYC>({
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true, unique: true },
  
  fullName: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  occupation: { type: String, required: true },
  pan: { type: String, required: true },

  mobile: { type: String, required: true },
  alternateMobile: { type: String },
  email: { type: String, required: true },

  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },

  familyDetails: [{
    name: String,
    relation: String,
    dob: String,
    gender: String,
  }],

}, { timestamps: true });

export default mongoose.model<ICustomerKYC>('CustomerKYC', customerKycSchema);
