/**
 * @swagger
 * tags:

 *   - name: Orders
 *     description: Order processing
 *   - name: Notifications
 *     description: User notifications
 */

const express = require('express');
const {

    createOrder,
    getMyOrders,
    getOrderById,
    getOrderStatuses,
    getNotifications
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Cart Routes Removed (Moved to cartRoutes.js)

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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Delivered, Cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/myorders', protect, getMyOrders);

// Notification Routes (Must be before /:id)
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

/**
 * @swagger
 * /api/orders/statuses:
 *   get:
 *     summary: Get order statuses
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of order statuses
 */
router.get('/statuses', getOrderStatuses);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
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
 *         description: Order object
 */
router.get('/:id', protect, getOrderById);

module.exports = router;
