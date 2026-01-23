const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const pusher = require('../utils/pusher');
const { sendToUser } = require('../services/notificationService');

// Helper to format message with isMine
const formatMessage = (message, userId) => {
    const msgObj = message.toObject ? message.toObject() : message;
    return {
        ...msgObj,
        isMine: msgObj.sender._id.toString() === userId.toString() || msgObj.sender.toString() === userId.toString()
    };
};

// Internal Helper to trigger events & notifications
const handlePostMessage = async (conversation, message, senderId, text, recipientIds) => {
    // 5. Trigger Pusher Event (Real-time)
    try {
        const channelName = `conversation-${conversation._id}`;
        // Populate message deeply for event if needed, but 'message' input usually shallow. 
        // Let's refetch or ensure it's populated before this function if possible, OR just send what we have.
        // For consistency with original code, let's look it up populated.
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name avatar')
            .populate('conversation');

        await pusher.trigger(channelName, 'new-message', populatedMessage);
    } catch (pusherError) {
        console.error('Pusher Error:', pusherError);
    }

    // 6. Send Push Notification (Non-blocking)
    try {
        const sender = await User.findById(senderId);
        const firstName = (sender && sender.name) ? sender.name.split(' ')[0] : 'Someone';
        const notificationTitle = `New message from ${firstName}`;
        const notificationBody = text ? (text.length > 50 ? text.substring(0, 50) + '...' : text) : 'Sent a photo/video';

        const dataPayload = {
            type: 'CHAT_MESSAGE',
            conversationId: conversation._id.toString(),
            senderId: senderId.toString(),
            messageId: message._id.toString()
        };

        // Send to all recipients (in 1-on-1, just one)
        for (const rId of recipientIds) {
            // Don't notify sender
            if (rId.toString() !== senderId.toString()) {
                await sendToUser(rId, notificationTitle, notificationBody, dataPayload);
            }
        }
    } catch (notificationError) {
        console.error('Notification Error:', notificationError);
    }
};

// @desc    Send a message (Text + Media) by Recipient ID
// @route   POST /api/chat/send
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const senderId = req.user.id;

        // Handle Media Uploads
        let mediaUrls = [];
        if (req.files && req.files.length > 0) {
            mediaUrls = req.files.map(file => file.path);
        } else if (req.body.media && Array.isArray(req.body.media)) {
            mediaUrls = req.body.media;
        }

        if (!recipientId) {
            return res.status(400).json({ success: false, message: 'Recipient ID is required' });
        }

        if (!text && mediaUrls.length === 0) {
            return res.status(400).json({ success: false, message: 'Message must contain text or media' });
        }

        // 1. Find or Create Conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recipientId]
            });
        }

        // 2. Create Message
        const message = await Message.create({
            conversation: conversation._id,
            sender: senderId,
            text,
            media: mediaUrls,
            status: 'sent'
        });

        // 3. Update Conversation Last Message
        conversation.lastMessage = message._id;
        await conversation.save();

        // 4. Client Response
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name avatar')
            .populate('conversation');

        res.status(201).json({
            success: true,
            data: formatMessage(populatedMessage, senderId) // isMine: true
        });

        // Background: Pusher & Notifications
        handlePostMessage(conversation, message, senderId, text, [recipientId]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Send a message to a specific Chat ID
// @route   POST /api/chat/:conversationId/send
// @access  Private
exports.sendMessageToChat = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { text } = req.body;
        const senderId = req.user.id;

        // Handle Media Uploads (Same logic)
        let mediaUrls = [];
        if (req.files && req.files.length > 0) {
            mediaUrls = req.files.map(file => file.path);
        } else if (req.body.media && Array.isArray(req.body.media)) {
            mediaUrls = req.body.media;
        }

        if (!text && mediaUrls.length === 0) {
            return res.status(400).json({ success: false, message: 'Message must contain text or media' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Verify membership
        if (!conversation.participants.includes(senderId)) {
            return res.status(401).json({ success: false, message: 'Not authorized for this chat' });
        }

        // Create Message
        const message = await Message.create({
            conversation: conversation._id,
            sender: senderId,
            text,
            media: mediaUrls,
            status: 'sent'
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name avatar')
            .populate('conversation');

        res.status(201).json({
            success: true,
            data: formatMessage(populatedMessage, senderId) // isMine: true
        });

        // Notification targets: All participants except sender
        const recipients = conversation.participants.filter(p => p.toString() !== senderId.toString());
        handlePostMessage(conversation, message, senderId, text, recipients);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Chat Details by Other User ID (Find or Create)
// @route   GET /api/chat/user/:userId
// @access  Private
exports.getChatByUserId = async (req, res) => {
    try {
        const { userId: otherUserId } = req.params;
        const currentUserId = req.user.id;

        // 1. Find Conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, otherUserId] }
        })
            .populate('participants', 'name avatar email'); // Get user details

        // 2. If no conversation, create one (per requirement)
        if (!conversation) {
            const newConversation = await Conversation.create({
                participants: [currentUserId, otherUserId]
            });
            // Re-fetch to populate
            conversation = await Conversation.findById(newConversation._id)
                .populate('participants', 'name avatar email');
        }

        // 3. Convert to formatted response
        const currentUser = conversation.participants.find(p => p._id.toString() === currentUserId.toString());
        const otherUser = conversation.participants.find(p => p._id.toString() === otherUserId.toString());

        // 4. Fetch Messages
        const messages = await Message.find({ conversation: conversation._id })
            .populate('sender', 'name avatar')
            .sort({ createdAt: 1 });

        const formattedMessages = messages.map(msg => formatMessage(msg, currentUserId));

        res.json({
            success: true,
            data: {
                chatId: conversation._id,
                currentUser: {
                    id: currentUser._id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                },
                otherUser: {
                    id: otherUser._id,
                    name: otherUser.name,
                    avatar: otherUser.avatar,
                    // role: otherUser.role // optional
                },
                messages: formattedMessages
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// @desc    Get all conversations for current user
// @route   GET /api/chat
// @access  Private
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
            .populate({
                path: 'participants',
                select: 'name avatar email role'
            })
            .populate({
                path: 'lastMessage',
                select: 'text media createdAt status sender'
            })
            .sort({ updatedAt: -1 });

        // Add isMine to lastMessage if it exists
        const data = conversations.map(conv => {
            const obj = conv.toObject();
            if (obj.lastMessage) {
                // Manually populate (lastMessage is just a subset usually, but sender is populated above)
                // Wait, in previous step I populated sender in lastMessage.
                // It is 'lastMessage.sender' (which is just ID if not populated, but I populated as 'sender')
                // Actually in getConversations I populated 'lastMessage' -> 'sender' (which is ID? No, Message.sender is Ref. So it is just ID unless deeper populate).
                // Let's check my populate: .populate({ path: 'lastMessage', select: '... sender' }).
                // Sender is an ID.
                obj.lastMessage.isMine = obj.lastMessage.sender.toString() === req.user.id.toString();
            }
            return obj;
        });

        res.json({ success: true, count: data.length, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/:conversationId/messages
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if (!conversation.participants.includes(req.user.id)) {
            return res.status(401).json({ success: false, message: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'name avatar')
            .sort({ createdAt: 1 });

        const formattedMessages = messages.map(msg => formatMessage(msg, req.user.id));

        res.json({ success: true, count: formattedMessages.length, data: formattedMessages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update message status (e.g. delivered -> seen)
// @route   PUT /api/chat/messages/:messageId/status
// @access  Private
exports.updateMessageStatus = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body;

        if (!['delivered', 'seen'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        message.status = status;
        if (status === 'seen' && !message.readBy.includes(req.user.id)) {
            message.readBy.push(req.user.id);
        }
        await message.save();

        try {
            const channelName = `conversation-${message.conversation}`;
            // For status update, we usually just send the ID and status.
            // But if user wants full object with isMine, we can send it (but remember isMine is specific to user).
            // I'll keep the object small for status updates.
            await pusher.trigger(channelName, 'message-status-update', {
                messageId: message._id,
                status: status,
                updatedBy: req.user.id
            });
        } catch (pusherError) {
            console.error('Pusher Error (Status Update):', pusherError);
        }

        res.json({ success: true, data: formatMessage(message, req.user.id) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Message Status Enum Values
// @route   GET /api/chat/statuses
// @access  Public
exports.getMessageStatuses = (req, res) => {
    const statuses = ['sent', 'delivered', 'seen'];
    res.json(statuses);
};
