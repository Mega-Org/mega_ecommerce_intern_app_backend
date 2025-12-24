/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Cart and Order management
 */

const express = require('express');
const {
    getCart,
    addToCart,
    removeFromCart,
    createOrder,
    getMyOrders,
    getNotifications
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Cart Routes
/**
 * @swagger
 * /api/orders/cart:
 *   get:
 *     summary: Get user cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart object
 */
router.get('/cart', protect, getCart);

/**
 * @swagger
 * /api/orders/cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - qty
 *             properties:
 *               productId:
 *                 type: string
 *               qty:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.post('/cart', protect, addToCart);

/**
 * @swagger
 * /api/orders/cart/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.delete('/cart/:id', protect, removeFromCart);

// Order Routes
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created order
 */
router.post('/', protect, createOrder);

/**
 * @swagger
 * /api/orders/myorders:
 *   get:
 *     summary: Get my orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/myorders', protect, getMyOrders);

// Notification Routes
/**
 * @swagger
 * /api/orders/notifications:
 *   get:
 *     summary: Get my notifications
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/notifications', protect, getNotifications);

module.exports = router;
