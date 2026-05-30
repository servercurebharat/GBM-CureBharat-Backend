"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToComplaint = exports.updateComplaintStatus = exports.getAllComplaints = exports.getUserComplaints = exports.createComplaint = void 0;
const Complaint_1 = __importDefault(require("../models/Complaint"));
/**
 * POST /api/complaints
 * Create a support ticket/complaint (Any authenticated user)
 */
const createComplaint = async (req, res) => {
    try {
        const { subject, category, priority, description } = req.body;
        if (!subject || !category || !description) {
            return res.status(400).json({ success: false, message: 'Subject, category, and description are required' });
        }
        // Generate unique Ticket ID (e.g. CB-8829)
        let ticketId = '';
        let exists = true;
        while (exists) {
            const randNum = Math.floor(1000 + Math.random() * 9000);
            ticketId = `CB-${randNum}`;
            const found = await Complaint_1.default.findOne({ ticketId });
            if (!found)
                exists = false;
        }
        const complaint = new Complaint_1.default({
            ticketId,
            memberId: req.user.memberId || 'UNKNOWN',
            submittedBy: req.user.name || 'Anonymous',
            subject,
            category,
            priority: priority || 'MEDIUM',
            status: 'open',
            description,
            replies: [],
            timeline: [{
                    time: new Date().toLocaleString('en-IN'),
                    actor: req.user.name || 'User',
                    note: 'Complaint submitted',
                    type: 'status'
                }]
        });
        await complaint.save();
        res.status(201).json({ success: true, message: 'Support ticket raised successfully', data: complaint });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createComplaint = createComplaint;
/**
 * GET /api/complaints/my
 * Get all support tickets raised by the current user
 */
const getUserComplaints = async (req, res) => {
    try {
        const complaints = await Complaint_1.default.find({ memberId: req.user.memberId }).sort({ createdAt: -1 });
        res.json({ success: true, data: complaints });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserComplaints = getUserComplaints;
/**
 * GET /api/complaints/all
 * Get all support tickets (Admin only)
 */
const getAllComplaints = async (req, res) => {
    try {
        const complaints = await Complaint_1.default.find().sort({ createdAt: -1 });
        res.json({ success: true, data: complaints });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllComplaints = getAllComplaints;
/**
 * PUT /api/complaints/:id/status
 * Update status of a support ticket
 */
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const complaint = await Complaint_1.default.findById(id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        complaint.status = status;
        complaint.timeline.push({
            time: new Date().toLocaleString('en-IN'),
            actor: req.user.name || 'System',
            note: `Status changed to ${status.replace('_', ' ')}`,
            type: 'status'
        });
        await complaint.save();
        res.json({ success: true, message: 'Status updated successfully', data: complaint });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateComplaintStatus = updateComplaintStatus;
/**
 * POST /api/complaints/:id/reply
 * Reply to a support ticket
 */
const replyToComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        const complaint = await Complaint_1.default.findById(id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        // Determine author role / label
        const authorRoleLabel = req.user.role.toLowerCase() === 'admin' ? 'Admin' : `${req.user.name} (${req.user.role.toUpperCase()})`;
        const initials = req.user.role.toLowerCase() === 'admin' ? 'AD' : req.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        complaint.replies.push({
            author: authorRoleLabel,
            initials,
            time: new Date().toLocaleString('en-IN'),
            message,
            attachments: []
        });
        complaint.timeline.push({
            time: new Date().toLocaleString('en-IN'),
            actor: req.user.name || 'User',
            note: `Replied to complaint`,
            type: 'reply'
        });
        await complaint.save();
        res.json({ success: true, message: 'Reply sent successfully', data: complaint });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.replyToComplaint = replyToComplaint;
