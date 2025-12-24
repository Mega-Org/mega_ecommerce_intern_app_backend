const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');

// --- CART CONTROLLERS ---

// @desc    Get User Cart
// @route   GET /api/orders/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, cartItems: [] });
        }
        res.json(cart);
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
            // Product exists in cart, update qty
            cart.cartItems[itemIndex].qty += Number(qty);
            if (cart.cartItems[itemIndex].qty <= 0) {
                cart.cartItems.splice(itemIndex, 1);
            }
        } else {
            // Add new
            if (qty > 0) {
                cart.cartItems.push({
                    product: productId,
                    name: product.name,
                    image: product.image,
                    price: product.price,
                    qty: Number(qty)
                });
            }
        }

        await cart.save();
        res.json(cart);
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

        cart.cartItems = cart.cartItems.filter(item => item.product.toString() !== req.params.id);

        await cart.save();
        res.json(cart);
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
        // Option 1: Create from passed items
        // Option 2: Create from stored Cart (preferred based on "checkout make order direct")

        // Let's support creating from Cart primarily.
        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in cart' });
        }

        const orderItems = cart.cartItems;
        const itemsPrice = orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
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
            isPaid: false, // Default
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

        // Notify Admin/Owner (Optional log or real notification)
        // console.log(`New Order: ${createdOrder._id}`);

        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get My Orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
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
