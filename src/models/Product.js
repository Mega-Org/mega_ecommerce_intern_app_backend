const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const productSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a product name']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    image: {
        type: String, // Main image
        required: [true, 'Please add a main image']
    },
    images: [String], // List of additional images
    video: {
        type: String, // Optional video
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false,
        select: false // Hide by default
    },
    category: {
        type: String
    },
    countInStock: {
        type: Number,
        default: 0
    },
    reviews: [reviewSchema],
    rating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
