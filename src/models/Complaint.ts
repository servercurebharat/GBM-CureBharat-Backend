import { Schema, model, Document } from 'mongoose';

export interface IAttachment {
  name: string;
  url: string;
  size: number;
}

export interface IReply {
  author: string;
  initials: string;
  time: string;
  message: string;
  attachments?: IAttachment[];
}

export interface ITimelineEntry {
  time: string;
  actor: string;
  note: string;
  type: 'status' | 'reply' | 'assign';
}

export interface IComplaint extends Document {
  ticketId: string;
  memberId: string;
  submittedBy: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  description: string;
  replies: IReply[];
  timeline: ITimelineEntry[];
  createdAt: Date;
}

const complaintSchema = new Schema<IComplaint>({
  ticketId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  submittedBy: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  description: { type: String, required: true },
  replies: [{
    author: String,
    initials: String,
    time: String,
    message: String,
    attachments: [{
      name: String,
      url: String,
      size: Number
    }]
  }],
  timeline: [{
    time: String,
    actor: String,
    note: String,
    type: { type: String, enum: ['status', 'reply', 'assign'] }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Complaint = model<IComplaint>('Complaint', complaintSchema);
export default Complaint;
