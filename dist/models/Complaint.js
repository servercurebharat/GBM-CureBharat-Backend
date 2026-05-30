"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const complaintSchema = new mongoose_1.Schema({
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
const Complaint = (0, mongoose_1.model)('Complaint', complaintSchema);
exports.default = Complaint;
