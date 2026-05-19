import { Response } from 'express';
import Complaint from '../models/Complaint';

/**
 * POST /api/complaints
 * Create a support ticket/complaint (Any authenticated user)
 */
export const createComplaint = async (req: any, res: Response) => {
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
      const found = await Complaint.findOne({ ticketId });
      if (!found) exists = false;
    }

    const complaint = new Complaint({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/complaints/my
 * Get all support tickets raised by the current user
 */
export const getUserComplaints = async (req: any, res: Response) => {
  try {
    const complaints = await Complaint.find({ memberId: req.user.memberId }).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/complaints/all
 * Get all support tickets (Admin only)
 */
export const getAllComplaints = async (req: any, res: Response) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/complaints/:id/status
 * Update status of a support ticket
 */
export const updateComplaintStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const complaint = await Complaint.findById(id);
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/complaints/:id/reply
 * Reply to a support ticket
 */
export const replyToComplaint = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Determine author role / label
    const authorRoleLabel = req.user.role.toLowerCase() === 'admin' ? 'Admin' : `${req.user.name} (${req.user.role.toUpperCase()})`;
    const initials = req.user.role.toLowerCase() === 'admin' ? 'AD' : req.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
