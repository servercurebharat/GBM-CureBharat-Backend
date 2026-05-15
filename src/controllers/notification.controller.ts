import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: (req as any).user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    await Notification.updateMany(
      { userId: (req as any).user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createNotification = async (userId: string, title: string, message: string, type: string = 'info', link?: string) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      link
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Failed to create notification', err);
  }
};
