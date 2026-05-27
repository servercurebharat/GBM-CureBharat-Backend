import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  policyId: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerState?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  plan: mongoose.Types.ObjectId;
  saleAmount: number;        // total billed in paise (price + GST)
  businessVolume: number;    // commission base in paise
  // Generic seller reference (any role can sell)
  sellerId: mongoose.Types.ObjectId;
  sellerMemberId: string;
  // Upline chain (populated by commission engine)
  hccId?: mongoose.Types.ObjectId;
  hcmId?: mongoose.Types.ObjectId;
  hbaId?: mongoose.Types.ObjectId;
  shId?: mongoose.Types.ObjectId;
  // Payment — Cashfree (primary)
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  // Payment — Razorpay (legacy / backward compat)
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod: 'cashfree' | 'razorpay';
  sourceType: 'dashboard' | 'public_link';
  // AutoPay / Subscription
  autopayEnabled: boolean;
  cashfreeSubscriptionId?: string;   // Cashfree subscription_id
  cashfreePlanId?: string;           // Cashfree plan_id used
  nextRenewalDate?: Date;            // When the next yearly charge fires
  renewalCount: number;              // How many times auto-renewed
  // Status
  status: 'active' | 'cancelled' | 'pending_autopay';
  commissionProcessed: boolean;
  cycleMonth: string;        // YYYY-MM
  createdAt: Date;
}

const saleSchema = new Schema<ISale>({
  policyId:         { type: String, required: true, unique: true },
  customerName:     { type: String, required: true },
  customerMobile:   { type: String, required: true },
  customerEmail:    { type: String },
  customerState:    { type: String },
  nomineeName:      { type: String },
  nomineeRelation:  { type: String },
  plan:             { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  saleAmount:       { type: Number, required: true },
  businessVolume:   { type: Number, required: true },
  sellerId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sellerMemberId:   { type: String, required: true },
  hccId:            { type: Schema.Types.ObjectId, ref: 'User' },
  hcmId:            { type: Schema.Types.ObjectId, ref: 'User' },
  hbaId:            { type: Schema.Types.ObjectId, ref: 'User' },
  shId:             { type: Schema.Types.ObjectId, ref: 'User' },
  cashfreeOrderId:   { type: String },
  cashfreePaymentId: { type: String, sparse: true },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String, sparse: true },
  paymentMethod:           { type: String, enum: ['cashfree', 'razorpay'], default: 'cashfree' },
  sourceType:              { type: String, enum: ['dashboard', 'public_link'], default: 'dashboard' },
  // AutoPay / Subscription
  autopayEnabled:          { type: Boolean, default: false },
  cashfreeSubscriptionId:  { type: String },
  cashfreePlanId:          { type: String },
  nextRenewalDate:         { type: Date },
  renewalCount:            { type: Number, default: 0 },
  // Status
  status:                  { type: String, enum: ['active', 'cancelled', 'pending_autopay'], default: 'active' },
  commissionProcessed:     { type: Boolean, default: false },
  cycleMonth:              { type: String, required: true },
}, { timestamps: true });

saleSchema.index({ sellerId: 1 });
saleSchema.index({ cycleMonth: 1 });
// Redundant index removed as it is already defined in the field definition above
// saleSchema.index({ razorpayPaymentId: 1 }, { unique: true });

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', saleSchema);
