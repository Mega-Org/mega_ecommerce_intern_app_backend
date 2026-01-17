const admin = require('../config/firebase');
const User = require('../models/User');
const { NotificationTypes } = require('../utils/constants');

/**
 * Send notification to a specific user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
exports.sendToUser = async (userId, title, body, data = {}) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmToken) {
            console.log(`No FCM token found for user ${userId}`);
            return;
        }

        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data, // Spread custom data
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for many flutter plugins
            },
            token: user.fcmToken
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message to user:', error);
        // Don't throw to avoid breaking the main flow
    }
};

/**
 * Send notification to a topic
 * @param {string} topic - Topic name (e.g., 'all_users', 'promotions')
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
exports.sendToTopic = async (topic, title, body, data = {}) => {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            topic: topic
        };

        const response = await admin.messaging().send(message);
        console.log(`Successfully sent message to topic ${topic}:`, response);
        return response;
    } catch (error) {
        console.error(`Error sending message to topic ${topic}:`, error);
    }
};

/**
 * Send notification to a specific token
 * @param {string} token - FCM Token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
exports.sendToToken = async (token, title, body, data = {}) => {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data, // Spread custom data
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for many flutter plugins
            },
            token: token
        };

        const response = await admin.messaging().send(message);
        console.log(`Successfully sent message to token:`, response);
        return response;
    } catch (error) {
        console.error(`Error sending message to token:`, error);
    }
};

/**
 * Subscribe a token to a topic
 * @param {string} token - FCM Token
 * @param {string} topic - Topic name
 */
exports.subscribeToTopic = async (token, topic) => {
    try {
        await admin.messaging().subscribeToTopic(token, topic);
        console.log(`Successfully subscribed to topic: ${topic}`);
    } catch (error) {
        console.error('Error subscribing to topic:', error);
    }
};

/**
 * Unsubscribe a token from a topic
 * @param {string} token - FCM Token
 * @param {string} topic - Topic name
 */
exports.unsubscribeFromTopic = async (token, topic) => {
    try {
        await admin.messaging().unsubscribeFromTopic(token, topic);
        console.log(`Successfully unsubscribed from topic: ${topic}`);
    } catch (error) {
        console.error('Error unsubscribing from topic:', error);
    }
};

/**
 * Get all available notification types
 */
exports.getNotificationTypes = () => {
    return Object.values(NotificationTypes);
};
