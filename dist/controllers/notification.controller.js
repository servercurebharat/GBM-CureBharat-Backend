"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.default.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ success: true, data: notifications });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification_1.default.findByIdAndUpdate(id, { isRead: true });
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        await Notification_1.default.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.markAllAsRead = markAllAsRead;
const createNotification = async (userId, title, message, type = 'info', link) => {
    try {
        const notification = new Notification_1.default({
            userId,
            title,
            message,
            type,
            link
        });
        await notification.save();
        return notification;
    }
    catch (err) {
        console.error('Failed to create notification', err);
    }
};
exports.createNotification = createNotification;
