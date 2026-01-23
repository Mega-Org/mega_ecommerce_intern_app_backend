/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time chat management
 */

const express = require('express');
const {
    sendMessage,
    sendMessageToChat,
    getConversations,
    getMessages,
    getChatByUserId,
    updateMessageStatus,
    getMessageStatuses
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

/**
 * @swagger
 * /api/chat/statuses:
 *   get:
 *     summary: Get message status enum values
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: List of message statuses
 */
router.get('/statuses', getMessageStatuses);

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Send a message via Recipient ID (Start new chat or append)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *             properties:
 *               recipientId:
 *                 type: string
 *               text:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/send', protect, upload.array('media', 5), sendMessage);

/**
 * @swagger
 * /api/chat/{conversationId}/send:
 *   post:
 *     summary: Send a message to a specific Chat ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/:conversationId/send', protect, upload.array('media', 5), sendMessageToChat);

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get all conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/', protect, getConversations);

/**
 * @swagger
 * /api/chat/user/{userId}:
 *   get:
 *     summary: Get (or create) Chat Details with a specific User
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The ID of the other user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat details with messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     chatId:
 *                       type: string
 *                     currentUser:
 *                       type: object
 *                     otherUser:
 *                       type: object
 *                     messages:
 *                       type: array
 */
router.get('/user/:userId', protect, getChatByUserId);

/**
 * @swagger
 * /api/chat/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/:conversationId/messages', protect, getMessages);

/**
 * @swagger
 * /api/chat/messages/{messageId}/status:
 *   put:
 *     summary: Update message status (seen/delivered)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [delivered, seen]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/messages/:messageId/status', protect, updateMessageStatus);

module.exports = router;
