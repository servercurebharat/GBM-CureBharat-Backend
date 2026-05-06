import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  requestId: string;
  user: mongoose.Types.ObjectId;
  grossAmount: number; // in paise
  tdsAmount: number; // in paise (5%)
  adminFee: number; // in paise
  netAmount: number; // in paise
  status: 'pending' | 'processing' | 'success' | 'failed' | 'rejected';
  paymentDetails?: {
    transactionId?: string;
    paidAt?: Date;
    method?: string;
    remarks?: string;
  };
  requestedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>({
  requestId: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  grossAmount: { type: Number, required: true },
  tdsAmount: { type: Number, required: true },
  adminFee: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'success', 'failed', 'rejected'], 
    default: 'pending' 
  },
  paymentDetails: {
    transactionId: { type: String },
    paidAt: { type: Date },
    method: { type: String },
    remarks: { type: String }
  },
  requestedAt: { type: Date, default: Date.now }
}, { timestamps: true });

withdrawalSchema.index({ user: 1 });
withdrawalSchema.index({ status: 1 });

export default mongoose.models.Withdrawal || mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
