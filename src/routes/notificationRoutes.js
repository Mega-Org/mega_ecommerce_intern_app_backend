const express = require('express');
const { getNotificationTypes, sendNotification } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/notifications/types:
 *   get:
 *     summary: Get all notification types
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: List of notification types
 */
router.get('/types', getNotificationTypes);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send Notification (Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Target User ID (Required if no topic/token provided)
 *               topic:
 *                 type: string
 *                 description: Target Topic (Required if no userId/token provided)
 *               token:
 *                 type: string
 *                 description: Target FCM Token (Required if no userId/topic provided)
 *               type:
 *                 type: string
 *                 description: Notification Type (controls app navigation)
 *                 enum:
 *                   - ORDER
 *                   - PRODUCT
 *                   - ANNOUNCEMENT
 *                   - REMINDER
 *                   - SYSTEM
 *               title:
 *                 type: string
 *                 description: Notification Title (Required)
 *               message:
 *                 type: string
 *                 description: Notification Body/Message (Required)
 *               data:
 *                 type: string
 *                 description: |
 *                   JSON string of additional data.
 *                   Example: '{"orderId": "123"}'
 *     responses:
 *       200:
 *         description: Notification sent
 */
const upload = require('../config/upload');
router.post('/send', protect, authorize('admin'), upload.none(), sendNotification);

module.exports = router;
