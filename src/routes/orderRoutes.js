/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: Cart management
 *   - name: Orders
 *     description: Order processing
 *   - name: Notifications
 *     description: User notifications
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
 *     tags: [Cart]
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
 *     tags: [Cart]
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
 *     tags: [Cart]
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

// Checkout / Create Order
/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Checkout and create order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post('/checkout', protect, createOrder);



/**
 * @swagger
 * /api/orders/myorders:
 *   get:
 *     summary: Get my orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
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
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/notifications', protect, getNotifications);

module.exports = router;
