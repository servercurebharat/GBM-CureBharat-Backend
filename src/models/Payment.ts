import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  user: mongoose.Types.ObjectId;
  amount: number;          // stored in paise
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  purpose: string;         // e.g. 'wallet_topup', 'plan_enrollment'
  cashfreeOrderId?: string;
  paymentSessionId?: string;
  cfPaymentId?: string;    // Cashfree's internal payment ID (from webhook)
  paidAt?: Date;
}

const paymentSchema = new Schema<IPayment>({
  orderId:          { type: String, required: true, unique: true },
  user:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:           { type: Number, required: true },          // in paise
  currency:         { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    default: 'pending',
  },
  purpose:          { type: String, default: 'wallet_topup' },
  cashfreeOrderId:  { type: String },
  paymentSessionId: { type: String },
  cfPaymentId:      { type: String },
  paidAt:           { type: Date },
}, { timestamps: true });

paymentSchema.index({ user: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
