const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const cloudinary = require('cloudinary').v2;

// Helper
const { formatProduct, formatPaginatedResponse } = require('../utils/formatResource');

// --- Helpers ---

// Extract Public ID from Cloudinary URL for deletion
const getPublicIdFromUrl = (url) => {
    try {
        if (!url) return null;
        // Example: https://res.cloudinary.com/demo/image/upload/v1234/mega-ecommerce/products/image.jpg
        const split = url.split('/');
        const filename = split[split.length - 1]; // image.jpg
        const name = filename.split('.')[0]; // image
        // We know our structure serves us well usually, but safe way:
        // We used folder in upload.js, so public_id is fully qualified usually returned by API.
        // But the URL contains version/folder/etc.
        // A robust way for standard cloudinary URLs:
        // schema: <base>/<cloud>/<type>/<action>/v<version>/<public_id>.<ext>
        // But our customized upload returns fully qualified public_id in the file object, which we don't save.
        // We only saved the URL.
        // Let's rely on the strategy: folder/name (without extension).
        // Our URL: .../mega-ecommerce/products/fieldname-timestamp.jpg
        // Public ID: mega-ecommerce/products/fieldname-timestamp

        // Find 'mega-ecommerce' index
        const folderIndex = split.findIndex(part => part === 'mega-ecommerce');
        if (folderIndex === -1) return null;

        const relevantParts = split.slice(folderIndex);
        // [mega-ecommerce, products, name.jpg]

        const lastPart = relevantParts[relevantParts.length - 1];
        const publicIdBase = lastPart.split('.')[0];
        relevantParts[relevantParts.length - 1] = publicIdBase;

        return relevantParts.join('/');
    } catch (error) {
        console.error('Error parsing public_id:', error);
        return null;
    }
};

const deleteFromCloudinary = async (url, resourceType = 'image') => {
    try {
        if (!url) return;
        // If it's a placeholder or default, ignore
        if (url.includes('placeholder')) return;

        const publicId = getPublicIdFromUrl(url);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
        // Don't crash app if delete fails
    }
};


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

        // FILTER: Only Non-Deleted Products
        const filter = { ...keyword, isDeleted: false };

        const count = await Product.countDocuments(filter);
        const productsDocs = await Product.find(filter)
            .populate('owner', 'name avatar rating')
            .sort({ createdAt: -1 })
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
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
            .populate('reviews.user', 'name avatar')
            .populate('owner', 'name avatar rating');

        // Note: We use findOne with isDeleted: false to ensure we don't return soft-deleted items.
        // MongoDB findById ignores filters usually, so explicit query is safer or check after.

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
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
            .populate('reviews.user', 'name avatar');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

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

        // --- Handle Images (Cloudinary) ---
        let image = 'https://via.placeholder.com/150'; // Default
        let images = [];
        let video = null;

        if (req.files) {
            // Main Image
            if (req.files.image && req.files.image[0]) {
                image = req.files.image[0].path; // Cloudinary URL
            }
            // Gallery
            if (req.files.images) {
                images = req.files.images.map(file => file.path);
            }
            // Video
            if (req.files.video && req.files.video[0]) {
                video = req.files.video[0].path;
            }
        } else if (req.body.image) {
            // Legacy/Text support
            image = req.body.image;
        }

        const product = new Product({
            owner: req.user._id,
            name,
            price,
            description,
            image,
            images,
            video,
            category,
            countInStock
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

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
        let product = await Product.findOne({ _id: req.params.id, isDeleted: false })
            .populate('owner', 'name avatar rating')
            .populate('reviews.user', 'name avatar');

        if (product) {
            const isFavorite = product.favorites.includes(req.user._id);

            if (isFavorite) {
                product.favorites = product.favorites.filter(
                    (id) => id.toString() !== req.user._id.toString()
                );
            } else {
                product.favorites.push(req.user._id);
            }

            await product.save();
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
        const productsDocs = await Product.find({ favorites: req.user._id, isDeleted: false })
            .populate('owner', 'name avatar rating');

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
        const productsDocs = await Product.find({ owner: req.user._id, isDeleted: false });
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
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
        }

        // --- Handle Image/Video Updates ---

        // 1. Main Image
        if (req.files && req.files.image && req.files.image[0]) {
            // Delete old image
            await deleteFromCloudinary(product.image);
            product.image = req.files.image[0].path;
        } else if (req.body.image) {
            product.image = req.body.image;
        }

        // 2. Video
        if (req.files && req.files.video && req.files.video[0]) {
            if (product.video) {
                await deleteFromCloudinary(product.video, 'video');
            }
            product.video = req.files.video[0].path;
        }

        // 3. Gallery Images (Complex)
        // If 'existingImages' is sent, user wants to KEEP these.
        // If 'req.files.images' sent, user wants to ADD these.
        // If nothing sent, do we keep all? Yes.

        let newGallery = null;

        // If existingImages is provided (even empty [] means delete all old ones except these)
        if (req.body.existingImages !== undefined) {
            let keepImages = [];
            if (Array.isArray(req.body.existingImages)) {
                keepImages = req.body.existingImages;
            } else {
                keepImages = [req.body.existingImages];
            }

            // Find which images were NOT kept -> Delete them
            const imagesToDelete = product.images.filter(img => !keepImages.includes(img));
            for (const img of imagesToDelete) {
                await deleteFromCloudinary(img);
            }

            newGallery = keepImages;
        }

        // Add New Uploads
        if (req.files && req.files.images) {
            const uploadedPaths = req.files.images.map(f => f.path);
            if (newGallery === null) {
                newGallery = [...product.images, ...uploadedPaths];
            } else {
                newGallery = [...newGallery, ...uploadedPaths];
            }
        }

        if (newGallery !== null) {
            product.images = newGallery;
        }

        product.name = name || product.name;
        product.price = price || product.price;
        product.description = description || product.description;
        product.countInStock = countInStock || product.countInStock;
        product.category = category || product.category;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a product (Smart Delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin/Owner)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false });

        if (!product) {
            // Graceful exit if already deleted
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check ownership
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
        }

        // --- SMART DELETION LOGIC ---

        // 1. Check if product is in any Order
        const hasOrders = await Order.exists({ 'orderItems.product': product._id });

        if (hasOrders) {
            // --- SOFT DELETE ---
            // Keep DB + Media. Hide from Store. Remove from Carts.
            product.isDeleted = true;
            await product.save();

            // Remove from all Carts (Cannot buy anymore)
            await Cart.updateMany({}, { $pull: { cartItems: { product: product._id } } });

            res.json({ success: true, message: 'Product archived (Soft Deleted - Exists in Orders)' });

        } else {
            // --- HARD DELETE ---
            // Delete DB + Media. Remove from Carts.

            // 1. Clean Media
            await deleteFromCloudinary(product.image, 'image');
            if (product.images && product.images.length > 0) {
                for (const img of product.images) {
                    await deleteFromCloudinary(img, 'image');
                }
            }
            if (product.video) {
                await deleteFromCloudinary(product.video, 'video');
            }

            // 2. Remove from Carts
            await Cart.updateMany({}, { $pull: { cartItems: { product: product._id } } });

            // 3. Delete Document
            await product.deleteOne();

            res.json({ success: true, message: 'Product permanently removed' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
