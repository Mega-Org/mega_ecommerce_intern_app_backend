/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

const express = require('express');
const {
    getProducts,
    getProductById,
    getProductReviews,
    createProduct,
    createProductReview,
    toggleFavorite,
    getUserFavorites,
    getMyProducts,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize, optionalProtect } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

/**
 * @swagger
 * /api/products/myproducts:
 *   get:
 *     summary: Get my products (Owner)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of own products
 */
router.get('/myproducts', protect, authorize('admin', 'owner'), getMyProducts);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', optionalProtect, getProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product (Admin/Owner)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - description
 *               - countInStock
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created product
 */
router.post('/', protect, authorize('admin', 'owner'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), createProduct);

/**
 * @swagger
 * /api/products/favorites:
 *   get:
 *     summary: Get user favorites
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorites
 */
router.get('/favorites', protect, getUserFavorites);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/:id', optionalProtect, getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product (Admin/Owner)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated product
 */
router.put('/:id', protect, authorize('admin', 'owner'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product (Admin/Owner)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', protect, authorize('admin', 'owner'), deleteProduct);

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   post:
 *     summary: Add review
 *     tags: [Products]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review added
 *
 */
router.post('/:id/reviews', protect, createProductReview);

/**
 * @swagger
 * /api/products/{id}/favorite:
 *   post:
 *     summary: Toggle favorite
 *     tags: [Favorites]
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
 *         description: Favorite toggled
 */
router.post('/:id/favorite', protect, toggleFavorite);

/**
 * @swagger
 * /api/products/favorites:
 *   get:
 *     summary: Get user favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorites
 */
// router.get('/favorites', protect, getUserFavorites); // Duplicate route removed if any

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   get:
 *     summary: Get reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/:id/reviews', optionalProtect, getProductReviews);

module.exports = router;
