const { sendToUser, sendToTopic, sendToToken, getNotificationTypes } = require('../services/notificationService');
const { NotificationTypes } = require('../utils/constants');
const Notification = require('../models/Notification');

// @desc    Get all notification types
// @route   GET /api/notifications/types
// @access  Public (or Private)
exports.getNotificationTypes = (req, res) => {
    try {
        const types = getNotificationTypes();
        res.json({ success: true, types });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send Notification (Admin)
// @route   POST /api/notifications/send
// @access  Private (Admin)
exports.sendNotification = async (req, res) => {
    try {
        const { userId, topic, token, type, title, message, data } = req.body;

        // Validation
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        let notificationData = {
            type: type || NotificationTypes.SYSTEM
        };

        // Parse data if it's a string (multipart/form-data sends JSON as string)
        if (data) {
            if (typeof data === 'string') {
                try {
                    const parsedData = JSON.parse(data);
                    notificationData = { ...notificationData, ...parsedData };
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON format for data field' });
                }
            } else {
                notificationData = { ...notificationData, ...data };
            }
        }

        let response;
        if (topic) {
            // Send to Topic
            response = await sendToTopic(topic, title, message, notificationData);
        } else if (token) {
            // Send to Token
            response = await sendToToken(token, title, message, notificationData);
        } else if (userId) {
            // Send to User
            response = await sendToUser(userId, title, message, notificationData);

            // Save to Database for User
            await Notification.create({
                user: userId,
                title,
                message,
                type: notificationData.type,
                data: notificationData,
                isRead: false
            });

        } else {
            return res.status(400).json({ success: false, message: 'UserId, Topic, or Token required' });
        }

        res.json({ success: true, message: 'Notification sent', response, data: notificationData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
