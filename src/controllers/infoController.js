// @desc    Get Terms and Conditions
// @route   GET /api/info/terms
// @access  Public
exports.getTerms = (req, res) => {
    res.json({
        success: true,
        data: {
            content: 'These are the terms and conditions...'
        }
    });
};

// @desc    Get Privacy Policy
// @route   GET /api/info/privacy
// @access  Public
exports.getPrivacy = (req, res) => {
    res.json({
        success: true,
        data: {
            content: 'This is the privacy policy...'
        }
    });
};

// @desc    Get About App
// @route   GET /api/info/about
// @access  Public
exports.getAbout = (req, res) => {
    res.json({
        success: true,
        data: {
            content: 'Mega Ecommerce App v1.0.0...'
        }
    });
};

// @desc    Rate App
// @route   POST /api/info/rate
// @access  Private (or Public depending on requirement, usually Private)
exports.rateApp = (req, res) => {
    const { rate, comment } = req.body;

    // In a real app, save this to a Feedback/Rate model
    console.log(`App Rated: ${rate} stars, Comment: ${comment}`);

    res.json({
        success: true,
        message: 'Thank you for your feedback!'
    });
};
