import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  category: 'auth' | 'financial' | 'network' | 'system' | 'kyc';
  details: string;
  ipAddress?: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
  sessionDuration?: number; // in seconds, primarily for login sessions
  createdAt: Date;
}

const ActivityLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['auth', 'financial', 'network', 'system', 'kyc'],
    required: true 
  },
  details: { type: String, required: true },
  ipAddress: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    city: { type: String }
  },
  sessionDuration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Index for high-performance filtering
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userRole: 1 });
ActivityLogSchema.index({ category: 1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
