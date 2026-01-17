/**
 * @swagger
 * tags:
 *   - name: Auth - Registration
 *     description: User registration and verification
 *   - name: Auth - Session
 *     description: Login and logout
 *   - name: Auth - Password Reset
 *     description: Forgot and reset password flow
 */

const express = require('express');
const {
    register,
    login,
    sendVerificationCode,
    verifyEmail,
    forgotPassword,
    resetPassword,
    verifyResetCode,
    resendResetCode,
    logout,
    deleteAccount
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../config/upload'); // Needed for avatar upload

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth - Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
router.post('/signup', upload.single('avatar'), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth - Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 */
router.post('/login', upload.none(), login);

/**
 * @swagger
 * /api/auth/send-verification:
 *   post:
 *     summary: Send email verification code
 *     tags: [Auth - Registration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Code sent
 */
router.post('/send-verification', protect, sendVerificationCode);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email using code
 *     tags: [Auth - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verified successfully
 */
router.post('/verify-email', protect, verifyEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send reset password code
 *     tags: [Auth - Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code sent, token returned
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/verify-pass-code:
 *   post:
 *     summary: Verify reset password code
 *     tags: [Auth - Password Reset]
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
 *         description: Code verified
 */
router.post('/verify-pass-code', protect, verifyResetCode);


/**
 * @swagger
 * /api/auth/resend-pass-code:
 *   post:
 *     summary: Resend reset password code
 *     tags: [Auth - Password Reset]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Code resent
 */
router.post('/resend-pass-code', protect, resendResetCode);


/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth - Password Reset]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.post('/reset-password', protect, resetPassword);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Auth - Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.get('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/delete:
 *   delete:
 *     summary: Delete user account
 *     tags: [Auth - Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/delete', protect, deleteAccount);

module.exports = router;
