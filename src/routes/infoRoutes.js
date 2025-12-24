/**
 * @swagger
 * tags:
 *   name: Info
 *   description: Static pages and app info
 */

const express = require('express');
const {
    getTerms,
    getPrivacy,
    getAbout,
    rateApp
} = require('../controllers/infoController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/info/terms:
 *   get:
 *     summary: Get Terms and Conditions
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Terms content
 */
router.get('/terms', getTerms);

/**
 * @swagger
 * /api/info/privacy:
 *   get:
 *     summary: Get Privacy Policy
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Privacy content
 */
router.get('/privacy', getPrivacy);

/**
 * @swagger
 * /api/info/about:
 *   get:
 *     summary: Get About App
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: About content
 */
router.get('/about', getAbout);

/**
 * @swagger
 * /api/info/rate:
 *   post:
 *     summary: Rate the app
 *     tags: [Info]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rate:
 *                 type: number
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thanks message
 */
router.post('/rate', protect, rateApp);

module.exports = router;
