const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');

// --- CART CONTROLLERS ---

// Helper to format Cart Item
const { formatProduct } = require('../utils/formatResource');

const formatCartItem = (item, req) => {
    // Handle populated product
    let productObj = item.product;

    // Use the standard formatter for product
    if (productObj) {
        productObj = formatProduct(productObj, req);
    }

    return {
        id: item._id,
        product: productObj,
        quantity: item.quantity,
        created_at: item.createdAt
    };
};

// @desc    Get User Cart
// @route   GET /api/orders/cart
// @access  Private
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

// @desc    Add to Cart / Update Qty
// @route   POST /api/orders/cart
// @access  Private
exports.addToCart = async (req, res) => {
    try {
        const { productId, qty } = req.body;
        // User sends 'qty', map to 'quantity'
        const quantityToAdd = Number(qty);

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
            // Product exists in cart, update quantity
            cart.cartItems[itemIndex].quantity += quantityToAdd;
            if (cart.cartItems[itemIndex].quantity <= 0) {
                cart.cartItems.splice(itemIndex, 1);
            }
        } else {
            // Add new
            if (quantityToAdd > 0) {
                cart.cartItems.push({
                    product: productId,
                    quantity: quantityToAdd
                });
            }
        }

        await cart.save();

        // Return fully populated cart for consistency
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });

        const formattedItems = populatedCart.cartItems.map(item => formatCartItem(item, req));
        res.json({ cartItems: formattedItems });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove Cart Item
// @route   DELETE /api/orders/cart/:id
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Filter by Product ID OR CartItem ID
        cart.cartItems = cart.cartItems.filter(item =>
            item.product.toString() !== req.params.id && item._id.toString() !== req.params.id
        );

        await cart.save();

        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });

        const formattedItems = populatedCart.cartItems.map(item => formatCartItem(item, req));
        res.json({ cartItems: formattedItems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ORDER CONTROLLERS ---

// @desc    Create new order (Checkout from Cart)
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        // Fetch cart with populated products to get current prices
        const cart = await Cart.findOne({ user: req.user._id })
            .populate({
                path: 'cartItems.product',
                populate: { path: 'owner', select: 'name avatar rating' }
            });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in cart' });
        }

        const orderItems = [];
        let itemsPrice = 0;

        for (const item of cart.cartItems) {
            const product = item.product;
            if (!product) continue; // Skip if product deleted

            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.image,
                price: product.price,
                qty: item.quantity // Mapping quantity -> qty
            });

            itemsPrice += product.price * item.quantity;
        }

        const taxPrice = 0; // Simplified
        const shippingPrice = 0; // Simplified
        const totalPrice = itemsPrice + taxPrice + shippingPrice;

        const order = new Order({
            user: req.user._id,
            orderItems,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
            isPaid: false,
            isDelivered: false
        });

        const createdOrder = await order.save();

        // Clear Cart
        cart.cartItems = [];
        await cart.save();

        // NOTIFICATION
        await Notification.create({
            user: req.user._id,
            title: 'Order Placed',
            message: `Order #${createdOrder._id} placed successfully.`,
            type: 'order'
        });

        const { formatImage } = require('../utils/formatResource');

        const formattedItems = orderItems.map(item => {
            // Clone to avoid mutation
            const newItem = { ...item };
            if (newItem.image) {
                newItem.image = formatImage(newItem.image, req);
            }
            return newItem;
        });

        // We can just return the populated order if we want, or the summary.
        // Let's stick to the summary requested but maybe populate the order items for the 'order' object return.

        // To be safe and consistent with "Resource" standard, we should probably format the `order.orderItems` too 
        // if they are accessed.

        res.status(201).json({
            success: true,
            message: 'Checkout successful',
            order: createdOrder,
            total: totalPrice,
            items: formattedItems
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get My Orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const pageSize = Number(req.query.limit) || 10;
        const page = Number(req.query.page) || 1;

        const count = await Order.countDocuments({ user: req.user._id });
        const ordersDocs = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        const orders = ordersDocs.map(order => {
            const o = order.toObject();
            if (o.orderItems) {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.get('host');
                o.orderItems = o.orderItems.map(item => {
                    if (item.image && !item.image.startsWith('http')) {
                        item.image = `${protocol}://${host}/${item.image}`;
                    }
                    return item;
                });
            }
            return o;
        });

        // Use standard pagination helper
        const { formatPaginatedResponse } = require('../utils/formatResource');
        res.json(formatPaginatedResponse('orders', orders, count, page, pageSize));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- NOTIFICATION CONTROLLERS ---

// @desc    Get Notifications
// @route   GET /api/orders/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
