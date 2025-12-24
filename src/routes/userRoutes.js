/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

const express = require('express');
const {
    getProfile,
    updateProfile,
    updateEmailRequest,
    verifyEmailUpdate,
    updatePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const upload = require('../config/upload'); // Import upload config

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get('/profile', protect, getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.put('/profile', protect, upload.single('avatar'), updateProfile);

/**
 * @swagger
 * /api/users/update-email:
 *   post:
 *     summary: Request email update (sends code)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *             properties:
 *               newEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post('/update-email', protect, updateEmailRequest);

/**
 * @swagger
 * /api/users/verify-email-update:
 *   post:
 *     summary: Verify email update code
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email updated
 */
router.post('/verify-email-update', protect, verifyEmailUpdate);

/**
 * @swagger
 * /api/users/update-password:
 *   put:
 *     summary: Update password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/update-password', protect, updatePassword);

module.exports = router;
