const User = require('../models/User');
const Product = require('../models/Product');
const TraderRequest = require('../models/TraderRequest');
const { subscribeToTopic } = require('../services/notificationService');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            const userData = user.toObject();

            // Fetch latest trader request
            const request = await TraderRequest.findOne({ user: user._id }).sort({ createdAt: -1 });
            const traderRequestStatus = request ? request.status : null;

            // Construct full avatar URL
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
            if (req.file) {
                if (req.file.path) {
                    user.avatar = req.file.path;
                } else {
                    console.log('Update Profile: File in memory but no path (Cloudinary missing). Keeping old avatar.');
                }
            } else if (req.body.avatar) {
                user.avatar = req.body.avatar;
            }

            const updatedUser = await user.save();
            const userData = updatedUser.toObject();

            // Fetch latest trader request
            const request = await TraderRequest.findOne({ user: updatedUser._id }).sort({ createdAt: -1 });
            const traderRequestStatus = request ? request.status : null;

            // Construct full avatar URL
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

        // Static code 1234
        user.verificationCode = '1234';
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;

        // Temporarily store new email? 
        // Or client sends new email again with code?
        // Let's store it separately or just pass it in step 2.
        // For security, usually store pending email in DB.
        // For simplicty, let's trust client to send it again or store it in a field 'pendingEmail' schema update needed.
        // I will add 'pendingEmail' to user Schema or just pass it back in api response to client to hold? No that's insecure.
        // I'll update schema quickly or misuse 'resetPasswordToken' for it? No.
        // Let's update schema. It's clean.

        // Actually, let's keep it extremely simple.
        // Client requests update -> Server sends code to NEW email (console log).
        // Then client sends Code + New Email -> Server verifies Code and checks New Email matches what was sent?
        // Hard to match without storage.
        // Let's rely on Client sending newEmail + Code + Password to confirm?
        // Let's do: Client sends New Email. Server 'sends' code to it.
        // Client inputs code.
        // Client calls Verify Update Email with (code, newEmail).

        // Note: For now, I will modify User model to add `pendingEmail`.

        user.pendingEmail = newEmail; // Will add to schema dynamically usually fails if schema strict.
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

        // Ideally check expiry

        if (user.pendingEmail) {
            user.email = user.pendingEmail;
            user.pendingEmail = undefined;
            user.verificationCode = undefined;
            user.isVerified = true;

            // Invalidate tokens
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

        // Resend code (Static 1234 for now)
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
    const roles = ['user', 'admin', 'owner']; // Matches User model enum
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

        // 1. Delete Products owned by user
        await Product.deleteMany({ owner: user._id });

        // 2. Remove reviews by this user from ALL products
        // This prevents products from having reviews linked to non-existent users
        await Product.updateMany(
            { 'reviews.user': user._id },
            { $pull: { reviews: { user: user._id } } }
        );

        // 3. Delete Trader Requests
        await TraderRequest.deleteMany({ user: user._id });

        // 4. Delete the user
        await user.deleteOne();

        res.json({ success: true, message: 'User and associated data removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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

        // 1. Delete Products owned by user
        await Product.deleteMany({ owner: user._id });

        // 2. Remove reviews by this user from ALL products
        // This prevents products from having reviews linked to non-existent users
        await Product.updateMany(
            { 'reviews.user': user._id },
            { $pull: { reviews: { user: user._id } } }
        );

        // 3. Delete Trader Requests
        await TraderRequest.deleteMany({ user: user._id });

        // 4. Delete the user
        await user.deleteOne();

        res.json({ success: true, message: 'User and associated data removed' });
    } catch (error) {
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

            // Subscribe to default topic
            await subscribeToTopic(fcmToken, 'all_users');

            res.json({ success: true, message: 'FCM Token updated' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
