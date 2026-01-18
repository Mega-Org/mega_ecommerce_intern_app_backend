/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: Cart management service
 */

const express = require('express');
const {
    getCart,
    addToCart,
    updateCartItemQuantity,
    incrementCartItem,
    decrementCartItem,
    removeFromCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart object
 */
router.get('/', protect, getCart);

/**
 * @swagger
 * /api/cart:
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
 *             properties:
 *               productId:
 *                 type: string
 *               qty:
 *                 type: number
 *                 description: Quantity to add (default 1)
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.post('/', protect, addToCart);

/**
 * @swagger
 * /api/cart/{id}:
 *   put:
 *     summary: Update cart item quantity (absolute)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.put('/:id', protect, updateCartItemQuantity);

/**
 * @swagger
 * /api/cart/{id}/increment:
 *   patch:
 *     summary: Increment cart item quantity by 1
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
router.patch('/:id/increment', protect, incrementCartItem);

/**
 * @swagger
 * /api/cart/{id}/decrement:
 *   patch:
 *     summary: Decrement cart item quantity by 1
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
router.patch('/:id/decrement', protect, decrementCartItem);

/**
 * @swagger
 * /api/cart/{id}:
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
router.delete('/:id', protect, removeFromCart);

module.exports = router;
