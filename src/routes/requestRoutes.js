/**
 * @swagger
 * tags:
 *   - name: Requests - User
 *     description: User actions for trader requests
 *   - name: Requests - Admin
 *     description: Admin management of trader requests
 */

const express = require('express');
const {
    createRequest,
    getRequests,
    updateRequestStatus
} = require('../controllers/requestController');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Submit a request to become a trader
 *     tags: [Requests - User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request submitted
 */
router.post('/', protect, createRequest);

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Get all trader requests
 *     tags: [Requests - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get('/', protect, authorize('admin'), getRequests);

/**
 * @swagger
 * /api/requests/{id}/action:
 *   put:
 *     summary: Approve or Reject a request
 *     tags: [Requests - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['Approved', 'Rejected']
 *                 description: New status for the request (Approved or Rejected)
 *               adminResponse:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request status updated
 */
router.put('/:id/action', protect, authorize('admin'), upload.none(), updateRequestStatus);

module.exports = router;
