/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User profile management
 *   - name: Users - Admin
 *     description: Admin user management
 *   - name: Auth - Update Email
 *     description: Update email flow
 */

const express = require('express');
const {
    getProfile,
    updateProfile,
    updateEmailRequest,
    verifyEmailUpdate,
    resendEmailUpdateCode,
    updatePassword,
    getUserTypes,
    deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

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
 *     tags: [Auth - Update Email]
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
 * /api/users/update-email/resend:
 *   post:
 *     summary: Resend email update code
 *     tags: [Auth - Update Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification code resent
 */
router.post('/update-email/resend', protect, resendEmailUpdateCode);

/**
 * @swagger
 * /api/users/verify-email-update:
 *   post:
 *     summary: Verify email update code
 *     tags: [Auth - Update Email]
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
// ... protected routes
router.put('/update-password', protect, updatePassword);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Users - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', protect, authorize('admin'), deleteUser);

/**
 * @swagger
 * /api/users/types:
 *   get:
 *     summary: Get all user types (roles)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of user roles
 */
router.get('/types', getUserTypes);

module.exports = router;
