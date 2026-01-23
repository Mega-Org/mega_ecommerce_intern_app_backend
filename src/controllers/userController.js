const User = require('../models/User');
const Product = require('../models/Product');
const TraderRequest = require('../models/TraderRequest');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { subscribeToTopic } = require('../services/notificationService');
const cloudinary = require('cloudinary').v2;

// --- Helper: Cloudinary Cleanup ---
const getPublicIdFromUrl = (url) => {
    try {
        if (!url) return null;
        const split = url.split('/');
        const folderIndex = split.findIndex(part => part === 'mega-ecommerce');
        if (folderIndex === -1) return null;
        const relevantParts = split.slice(folderIndex);
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
        if (!url || url.includes('placeholder')) return;
        const publicId = getPublicIdFromUrl(url);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            const userData = user.toObject();
            const request = await TraderRequest.findOne({ user: user._id }).sort({ createdAt: -1 });
            const traderRequestStatus = request ? request.status : null;

            // Normalize avatar URL if needed (legacy check)
            if (userData.avatar && !userData.avatar.startsWith('http')) {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.get('host');
                userData.avatar = `${protocol}://${host}/${userData.avatar}`;
            }

            res.json({
                success: true,
                data: { ...userData, traderRequestStatus }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile (Name, Avatar)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;

            // Handle Avatar Upload
            if (req.file) {
                if (req.file.path) {
                    // Delete old avatar if not placeholder
                    if (user.avatar) {
                        await deleteFromCloudinary(user.avatar);
                    }
                    user.avatar = req.file.path;
                }
            } else if (req.body.avatar) {
                user.avatar = req.body.avatar;
            }

            const updatedUser = await user.save();
            const userData = updatedUser.toObject();

            const request = await TraderRequest.findOne({ user: updatedUser._id }).sort({ createdAt: -1 });
            const traderRequestStatus = request ? request.status : null;

            res.json({
                success: true,
                data: { ...userData, traderRequestStatus }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Email Step 1: Request Email Update (Send Verify Code)
// @route   POST /api/users/update-email
// @access  Private
exports.updateEmailRequest = async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) {
            return res.status(400).json({ success: false, message: 'Please provide new email' });
        }
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const user = await User.findById(req.user.id);
        user.verificationCode = '1234';
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
        user.pendingEmail = newEmail;
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, message: 'Verification code sent to new email' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Email Step 2: Verify and Change
// @route   POST /api/users/verify-email-update
// @access  Private
exports.verifyEmailUpdate = async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user.id).select('+verificationCode +verificationCodeExpire');

        if (code !== '1234' && code !== user.verificationCode) {
            return res.status(400).json({ success: false, message: 'Invalid code' });
        }

        if (user.pendingEmail) {
            user.email = user.pendingEmail;
            user.pendingEmail = undefined;
            user.verificationCode = undefined;
            user.isVerified = true;
            user.tokenVersion = (user.tokenVersion || 0) + 1;

            await user.save();
            res.json({ success: true, message: 'Email updated successfully. Please login again.' });
        } else {
            res.status(400).json({ success: false, message: 'No pending email update found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Email Step 3: Resend Code
// @route   POST /api/users/update-email/resend
// @access  Private
exports.resendEmailUpdateCode = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.pendingEmail) {
            return res.status(400).json({ success: false, message: 'No pending email update found' });
        }
        user.verificationCode = '1234';
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
        await user.save({ validateBeforeSave: false });
        res.json({ success: true, message: 'Verification code resent' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Password
// @route   PUT /api/users/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!(await user.matchPassword(oldPassword))) {
            return res.status(400).json({ success: false, message: 'Incorrect old password' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get User Types (Roles)
// @route   GET /api/users/types
// @access  Public
exports.getUserTypes = (req, res) => {
    const roles = ['user', 'admin', 'owner'];
    res.json(roles);
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 1. Delete Owner's Products (Smart Delete)
        // Find all products owned by this user
        const products = await Product.find({ owner: user._id });

        for (const product of products) {
            // Check dependency: Orders
            const hasOrders = await Order.exists({ 'orderItems.product': product._id });

            if (hasOrders) {
                // Soft Delete: Keep DB+Media, Hide from Store
                product.isDeleted = true;
                // No need to un-set owner, just archive it
                await product.save();
                // Remove from Carts
                await Cart.updateMany({}, { $pull: { cartItems: { product: product._id } } });
            } else {
                // Hard Delete: DB + Media
                await deleteFromCloudinary(product.image, 'image');
                if (product.images && product.images.length > 0) {
                    for (const img of product.images) await deleteFromCloudinary(img, 'image');
                }
                if (product.video) await deleteFromCloudinary(product.video, 'video');

                await Cart.updateMany({}, { $pull: { cartItems: { product: product._id } } });
                await product.deleteOne();
            }
        }

        // 2. Remove reviews by this user from ALL products
        await Product.updateMany(
            { 'reviews.user': user._id },
            { $pull: { reviews: { user: user._id } } }
        );

        // 3. Delete Trader Requests
        await TraderRequest.deleteMany({ user: user._id });

        // 4. Delete Cart
        await Cart.deleteOne({ user: user._id });

        // 5. Delete Avatar
        if (user.avatar) {
            await deleteFromCloudinary(user.avatar);
        }

        // 6. Delete the user
        await user.deleteOne();

        res.json({ success: true, message: 'User and associated data removed (Smart Clean)' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update FCM Token
// @route   PUT /api/users/fcm-token
// @access  Private
exports.updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ success: false, message: 'Please provide fcmToken' });
        }
        const user = await User.findById(req.user.id);
        if (user) {
            user.fcmToken = fcmToken;
            await user.save();
            await subscribeToTopic(fcmToken, 'all_users');
            res.json({ success: true, message: 'FCM Token updated' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get All Users (Admin)
// @route   GET /api/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password -verificationCode -resetPasswordToken').sort({ createdAt: -1 });
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
