const Product = require('../models/Product');
const Notification = require('../models/Notification');

// Helper
// Helper
const { formatProduct, formatPaginatedResponse } = require('../utils/formatResource');

// @desc    Fetch all products (Pagination + Search)
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;

        const keyword = req.query.keyword
            ? {
                name: {
                    $regex: req.query.keyword,
                    $options: 'i',
                },
            }
            : {};

        const count = await Product.countDocuments({ ...keyword });
        const productsDocs = await Product.find({ ...keyword })
            .populate('owner', 'name avatar rating')
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        const products = productsDocs.map(product => formatProduct(product, req, { excludeReviews: true }));

        res.json(formatPaginatedResponse('products', products, count, page, pageSize));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('reviews.user', 'name avatar')
            .populate('owner', 'name avatar rating');

        if (product) {
            res.json(formatProduct(product, req, { excludeReviews: false }));
        } else {
            res.status(404).json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Product Reviews
// @route   GET /api/products/:id/reviews
// @access  Public
exports.getProductReviews = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('reviews.user', 'name avatar');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // We use the helper but only extract reviews
        // We can reuse formatProduct with excludeReviews: false and just return reviews
        const formattedProduct = formatProduct(product, req, { excludeReviews: false });

        res.json({
            success: true,
            reviews: formattedProduct.reviews,
            rating: formattedProduct.rating,
            numReviews: formattedProduct.numReviews
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin/Owner
exports.createProduct = async (req, res) => {
    try {
        const { name, price, description, countInStock, category } = req.body;

        // Handle Image Uploads with Cloudinary
        let image = 'https://via.placeholder.com/150'; // Default
        let images = [];

        // Helper to get path or base64
        const getImagePath = (file) => {
            if (file.path) return file.path;
            if (file.buffer) {
                return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            }
            return null;
        };

        if (req.files) {
            if (req.files.image && req.files.image[0]) {
                const path = getImagePath(req.files.image[0]);
                if (path) image = path;
            }
            if (req.files.images) {
                images = req.files.images.map(file => getImagePath(file)).filter(p => p !== null);
            }
        } else if (req.body.image) {
            // Allow manual URL overrides if sent as text
            image = req.body.image;
        }

        const product = new Product({
            owner: req.user._id,
            name,
            price,
            description,
            image,
            images,
            category,
            countInStock
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            const alreadyReviewed = product.reviews.find(
                (r) => r.user.toString() === req.user._id.toString()
            );

            if (alreadyReviewed) {
                return res.status(400).json({ success: false, message: 'Product already reviewed' });
            }

            const review = {
                name: req.user.name,
                rating: Number(rating),
                comment,
                user: req.user._id,
            };

            product.reviews.push(review);

            product.numReviews = product.reviews.length;
            // Calculate average
            const total = product.reviews.reduce((acc, item) => item.rating + acc, 0);
            product.rating = total / product.reviews.length;

            await product.save();

            // Notify Owner
            if (product.owner.toString() !== req.user._id.toString()) {
                await Notification.create({
                    user: product.owner,
                    title: 'New Review',
                    message: `User ${req.user.name} reviewed your product ${product.name}.`,
                    type: 'review'
                });
            }

            res.status(201).json({ success: true, message: 'Review added' });
        } else {
            res.status(404).json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle Favorite
// @route   POST /api/products/:id/favorite
// @access  Private
exports.toggleFavorite = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id)
            .populate('owner', 'name avatar rating')
            .populate('reviews.user', 'name avatar');

        if (product) {
            const isFavorite = product.favorites.includes(req.user._id);

            if (isFavorite) {
                // Remove
                product.favorites = product.favorites.filter(
                    (id) => id.toString() !== req.user._id.toString()
                );
            } else {
                // Add
                product.favorites.push(req.user._id);
            }

            await product.save();

            // Now including reviews
            const formatted = formatProduct(product, req, { excludeReviews: false });

            res.json({
                success: true,
                message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
                product: formatted
            });
        } else {
            res.status(404).json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get User Favorites
// @route   GET /api/products/favorites
// @access  Private
exports.getUserFavorites = async (req, res) => {
    try {
        const productsDocs = await Product.find({ favorites: req.user._id })
            .populate('owner', 'name avatar rating');

        // Favorites usually shown as list, exclude reviews
        const products = productsDocs.map(product => formatProduct(product, req, { excludeReviews: true }));
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get My Products (Trader/Owner)
// @route   GET /api/products/myproducts
// @access  Private (Owner/Admin)
exports.getMyProducts = async (req, res) => {
    try {
        const productsDocs = await Product.find({ owner: req.user._id });
        const products = productsDocs.map(product => formatProduct(product, req, { excludeReviews: true }));
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin/Owner)
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, description, countInStock, category } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check ownership (Admin can update anything)
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
        }

        // Helper to get path or base64
        const getImagePath = (file) => {
            if (file.path) return file.path;
            if (file.buffer) {
                return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            }
            return null;
        };

        // Handle Image Uploads
        // Handle Image Update (Main Image)
        if (req.files && req.files.image && req.files.image[0]) {
            const path = getImagePath(req.files.image[0]);
            if (path) product.image = path;
        } else if (req.body.image) {
            product.image = req.body.image;
        }

        // Handle Gallery Images (Flexible Add/Remove)
        let updatedGallery = null;

        // 1. Determine base gallery from 'existingImages' (if provided) or current images
        if (req.body.existingImages !== undefined) {
            if (Array.isArray(req.body.existingImages)) {
                updatedGallery = [...req.body.existingImages];
            } else {
                updatedGallery = [req.body.existingImages];
            }
        }

        // 2. Append new uploads
        if (req.files && req.files.images) {
            if (updatedGallery === null) {
                updatedGallery = [...product.images]; // Default: Keep all existing if not explicitly managed
            }
            const newPaths = req.files.images.map(file => getImagePath(file)).filter(p => p !== null);
            updatedGallery = [...updatedGallery, ...newPaths];
        }

        // 3. Apply changes if gallery was modified
        if (updatedGallery !== null) {
            product.images = updatedGallery;
        }

        product.name = name || product.name;
        product.price = price || product.price;
        product.description = description || product.description;
        product.countInStock = countInStock || product.countInStock;
        product.category = category || product.category;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin/Owner)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check ownership
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
        }

        await product.deleteOne(); // or remove() depending on Mongoose version
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
