
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { formatProduct } = require('../utils/formatResource');

// Helper to format Cart Item
const formatCartItem = (item, req) => {
    let productObj = item.product;
    if (productObj) {
        productObj = formatProduct(productObj, req, { excludeReviews: true });
    }
    return {
        id: item._id,
        product: productObj,
        quantity: item.quantity,
        created_at: item.createdAt
    };
};

/**
 * @desc    Get User Cart
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id })
            .populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, cartItems: [] });
        }

        const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));

        res.json({
            cartItems: formattedItems
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Add Item to Cart
 * @route   POST /api/cart
 * @access  Private
 */
exports.addToCart = async (req, res) => {
    try {
        const { productId, qty } = req.body;
        const quantityToAdd = Number(qty) || 1;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, cartItems: [] });
        }

        const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

        if (itemIndex > -1) {
            cart.cartItems[itemIndex].quantity += quantityToAdd;
        } else {
            cart.cartItems.push({
                product: productId,
                quantity: quantityToAdd
            });
        }

        await cart.save();
        await cart.populate({
            path: 'cartItems.product',
            populate: { path: 'owner', select: 'name avatar rating' }
        });

        const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
        res.json({ cartItems: formattedItems });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update Cart Item Quantity (Absolute)
 * @route   PUT /api/cart/:id
 * @access  Private
 */
exports.updateCartItemQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;
        const productId = req.params.id;
        const newQuantity = Number(quantity);

        if (newQuantity <= 0) {
            // If explicit update to 0, remove item
            return exports.removeFromCart(req, res);
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

        if (itemIndex > -1) {
            cart.cartItems[itemIndex].quantity = newQuantity;
        } else {
            // Optimization: If they try to update item that's not in cart, maybe add it?
            // For strict PUT semantic on "cart item", it implies existence.
            // But usually convenient to just add it. Let's return 404 for item to be safe/strict, 
            // or 400.
            return res.status(404).json({ success: false, message: 'Item not in cart' });
        }

        await cart.save();
        await cart.populate({
            path: 'cartItems.product',
            populate: { path: 'owner', select: 'name avatar rating' }
        });

        const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
        res.json({ cartItems: formattedItems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Increment Cart Item Quantity (+1)
 * @route   PATCH /api/cart/:id/increment
 * @access  Private
 */
exports.incrementCartItem = async (req, res) => {
    try {
        const productId = req.params.id;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

        if (itemIndex > -1) {
            cart.cartItems[itemIndex].quantity += 1;
            await cart.save();
            await cart.populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });
            const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
            return res.json({ cartItems: formattedItems });
        } else {
            // If not in cart, maybe add with qty 1?
            // Let's add it for better UX
            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ message: 'Product not found' });

            cart.cartItems.push({ product: productId, quantity: 1 });
            await cart.save();
            await cart.populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });
            const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
            return res.json({ cartItems: formattedItems });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Decrement Cart Item Quantity (-1)
 * @route   PATCH /api/cart/:id/decrement
 * @access  Private
 */
exports.decrementCartItem = async (req, res) => {
    try {
        const productId = req.params.id;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);

        if (itemIndex > -1) {
            cart.cartItems[itemIndex].quantity -= 1;

            if (cart.cartItems[itemIndex].quantity <= 0) {
                cart.cartItems.splice(itemIndex, 1);
            }

            await cart.save();
            await cart.populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });

            const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
            res.json({ cartItems: formattedItems });
        } else {
            return res.status(404).json({ success: false, message: 'Item not in cart' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Remove Item from Cart
 * @route   DELETE /api/cart/:id
 * @access  Private
 */
exports.removeFromCart = async (req, res) => {
    try {
        const productId = req.params.id;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Filter out item by Product ID (or CartItem ID if passed, but typically ProductID)
        // Check if ID passed is ObjectId of product or _id of item
        // Standard consistency: usually we pass Product ID for cart operations in this app

        const initialLength = cart.cartItems.length;
        cart.cartItems = cart.cartItems.filter(item =>
            item.product.toString() !== productId && item._id.toString() !== productId
        );

        if (cart.cartItems.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        await cart.save();
        await cart.populate({
            path: 'cartItems.product',
            populate: { path: 'owner', select: 'name avatar rating' }
        });

        const formattedItems = cart.cartItems.map(item => formatCartItem(item, req));
        res.json({ cartItems: formattedItems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
