const mongoose = require('mongoose');

const traderRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    message: {
        type: String,
        required: [true, 'Please add a message explaining why you want to be a trader']
    },
    adminResponse: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TraderRequest', traderRequestSchema);
