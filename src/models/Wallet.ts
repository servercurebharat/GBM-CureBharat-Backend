import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerEntry {
  _id?: string;
  amount: number;
  type: 'direct' | 'override' | 'leadership' | 'withdrawal' | 'tds_deduction';
  description: string;
  status: 'provisional' | 'final';
  date: Date;
  sourceUserId?: mongoose.Types.ObjectId;
  saleId?: mongoose.Types.ObjectId;
  cycleMonth: string; // YYYY-MM
}

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  provisionalBalance: number;
  finalBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  ledger: ILedgerEntry[];
}

const walletSchema = new Schema<IWallet>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  provisionalBalance: { type: Number, default: 0 },
  finalBalance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  ledger: [{
    amount: Number,
    type: { type: String, enum: ['direct', 'override', 'leadership', 'withdrawal', 'tds_deduction'] },
    description: String,
    status: { type: String, enum: ['provisional', 'final'], default: 'provisional' },
    date: { type: Date, default: Date.now },
    sourceUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
    cycleMonth: String
  }]
}, { timestamps: true });

// Index on user removed as it is already indexed via unique: true

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', walletSchema);
