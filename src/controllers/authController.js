const User = require('../models/User');
const TraderRequest = require('../models/TraderRequest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT
const generateToken = (user) => {
    return jwt.sign({ id: user._id, tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let avatar = req.body.avatar; // If sent as URL string

        // If file uploaded (requires upload middleware on route)
        if (req.file) {
            // Cloudinary: req.file.path is URL
            // Disk Storage: req.file.path is local path
            // Memory Storage (fallback): req.file.path is undefined, buffer exists
            if (req.file.path) {
                avatar = req.file.path;
            } else {
                // If using memory storage fallback, we can't save the file easily without an external service
                // So we keep the default avatar (or whatever was passed in body)
                // Optionally log this case
                console.log('File uploaded to memory but not saved (no Cloudinary config). Using default avatar.');
            }
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            avatar
        });

        if (user) {
            // Construct full avatar URL
            let avatarUrl = user.avatar;
            if (user.avatar && !user.avatar.startsWith('http')) {
                // Determine protocol (x-forwarded-proto is set by Vercel/proxies)
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.get('host');
                avatarUrl = `${protocol}://${host}/${user.avatar}`;
            }

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: avatarUrl,
                    role: user.role,
                    isVerified: user.isVerified,
                    token: generateToken(user),
                },
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password, fcmToken } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide an email and password' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');


        if (user && (await user.matchPassword(password))) {
            // Update FCM Token if provided
            if (fcmToken) {
                user.fcmToken = fcmToken;
                await user.save();
            }

            const userData = await User.findById(user._id).select('-password');

            // Construct full avatar URL
            let avatarUrl = user.avatar;
            if (user.avatar && !user.avatar.startsWith('http')) {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.get('host');
                avatarUrl = `${protocol}://${host}/${user.avatar}`;
            }

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: avatarUrl,
                    role: user.role,
                    isVerified: user.isVerified,
                    token: generateToken(userData),
                },
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send Email Verification Code
// @route   POST /api/auth/send-verification
// @access  Private
exports.sendVerificationCode = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // STATIC CODE FOR DEVELOPMENT
        const verificationCode = '1234';

        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        console.log(`Verification code for ${user.email}: ${verificationCode}`);

        res.status(200).json({ success: true, message: 'Verification code sent (check console for dev)' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify Email
// @route   POST /api/auth/verify-email
// @access  Private
exports.verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Please provide a verification code' });
        }

        // Use findById explicitly
        const user = await User.findById(req.user._id).select('+verificationCode +verificationCodeExpire');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User already verified' });
        }

        // Safe access to verificationCode
        const dbCode = user.verificationCode;

        if (code !== '1234' && code !== dbCode) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        // Check expire only if using dynamic code and it exists
        if (code !== '1234' && user.verificationCodeExpire && user.verificationCodeExpire < Date.now()) {
            return res.status(400).json({ success: false, message: 'Verification code expired' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Static code
        const resetToken = '1234';
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        console.log(`Reset code for ${user.email}: ${resetToken}`);

        // Generate temp token for the flow
        const token = jwt.sign({ id: user._id, scope: 'reset_pending' }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.status(200).json({ success: true, message: 'Reset code sent', token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify Reset Code
// @route   POST /api/auth/verify-pass-code
// @access  Private (Protected by token from forgot-password)
exports.verifyResetCode = async (req, res) => {
    try {
        const { code } = req.body;

        // Check scope
        if (!req.tokenPayload || req.tokenPayload.scope !== 'reset_pending') {
            return res.status(403).json({ success: false, message: 'Invalid token scope' });
        }

        // Fetch user with hidden fields
        const user = await User.findById(req.user.id).select('+resetPasswordToken +resetPasswordExpire');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify code
        // We accept the static '1234' or the DB stored code
        const isValid = (code === '1234') || (user.resetPasswordToken === code);

        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid code' });
        }

        if (user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({ success: false, message: 'Code expired' });
        }

        // Mark as verified
        user.resetPasswordToken = 'VERIFIED';
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Add time for next step
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Code verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Private (Protected by verified token)
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        // Fetch user with hidden fields
        const user = await User.findById(req.user.id).select('+resetPasswordToken +resetPasswordExpire');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify that previous step was done
        if (user.resetPasswordToken !== 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'Email not verified for reset' });
        }

        if (user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({ success: false, message: 'Session expired' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated success' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Resend Reset Code
// @route   POST /api/auth/resend-pass-code
// @access  Private (Protected by token from forgot-password)
exports.resendResetCode = async (req, res) => {
    try {
        // Check scope
        if (!req.tokenPayload || req.tokenPayload.scope !== 'reset_pending') {
            return res.status(403).json({ success: false, message: 'Invalid token scope' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Static code (same as forgotPassword)
        const resetToken = '1234';
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        console.log(`Resent Reset code for ${user.email}: ${resetToken}`);

        res.status(200).json({ success: true, message: 'Reset code resent' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Delete Account
// @route   DELETE /api/auth/delete
// @access  Private
exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
