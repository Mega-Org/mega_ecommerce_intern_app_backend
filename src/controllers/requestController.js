const TraderRequest = require('../models/TraderRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/emailService');

// @desc    Create a trader request
// @route   POST /api/requests
// @access  Private (User)
exports.createRequest = async (req, res) => {
    try {
        const { message } = req.body;

        // Check if user already has a pending request
        const existingRequest = await TraderRequest.findOne({
            user: req.user.id,
            status: 'Pending'
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'You already have a pending request.' });
        }

        // Check if user is already an owner
        if (req.user.role === 'owner') {
            return res.status(400).json({ success: false, message: 'You are already a trader.' });
        }

        const request = await TraderRequest.create({
            user: req.user.id,
            message
        });

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all requests (Admin)
// @route   GET /api/requests
// @access  Private (Admin)
exports.getRequests = async (req, res) => {
    try {
        const requests = await TraderRequest.find()
            .populate('user', 'name email role')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update request status (Admin)
// @route   PUT /api/requests/:id/action
// @access  Private (Admin)
exports.updateRequestStatus = async (req, res) => {
    try {
        const { status, adminResponse } = req.body;
        // status: 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Use Approved or Rejected.' });
        }

        const request = await TraderRequest.findById(req.params.id).populate('user');

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
        }

        request.status = status;
        request.adminResponse = adminResponse;
        await request.save();

        const user = request.user;
        let notificationMessage = '';
        let emailSubject = '';
        let emailMessage = '';

        if (status === 'Approved') {
            // Update User Role
            user.role = 'owner';
            await user.save();

            notificationMessage = 'Congratulations! Your request to become a trader has been APPROVED.';
            emailSubject = 'Trader Request Approved - Mega Ecommerce';
            emailMessage = `Hello ${user.name},\n\nWe are pleased to inform you that your request to become a trader on Mega Ecommerce has been approved!\n\nYou can now log in and start adding your products.\n\nWelcome aboard!\n\nAdmin Comment: ${adminResponse || 'Welcome!'}`;
        } else {
            notificationMessage = `Your request to become a trader was Rejected. reason: ${adminResponse || 'No reason provided'}`;
            emailSubject = 'Trader Request Update - Mega Ecommerce';
            emailMessage = `Hello ${user.name},\n\nYour request to become a trader has been rejected.\n\nReason: ${adminResponse || 'Does not meet criteria'}\n\nYou can try again later.`;
        }

        // 1. Send In-App Notification
        await Notification.create({
            user: user._id,
            title: `Trader Request ${status}`,
            message: notificationMessage,
            type: 'system' // or specific type
        });

        // 2. Send Email (Mock)
        await sendEmail({
            email: user.email,
            subject: emailSubject,
            message: emailMessage
        });

        res.json({ success: true, data: request, message: `Request ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
