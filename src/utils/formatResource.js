const formatImage = (imagePath, req) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/${imagePath}`;
};

const formatReview = (review, req) => {
    if (!review || typeof review !== 'object') return review;

    // Normalize format
    const r = review.toObject ? review.toObject() : review;

    let reviewUser = null;
    if (r.user && typeof r.user === 'object') {
        reviewUser = {
            id: r.user._id,
            name: r.user.name,
            image: formatImage(r.user.avatar, req)
        };
    }

    return {
        id: r._id,
        user: reviewUser,
        comment: r.comment,
        rating: r.rating,
        date: r.createdAt
    };
};

const formatProduct = (product, req, options = {}) => {
    // Default options
    const { excludeReviews = false } = options;

    if (!product || typeof product !== 'object') return product;

    const p = product.toObject ? product.toObject() : { ...product };

    if (p.image) {
        p.image = formatImage(p.image, req);
    }

    if (p.images && p.images.length > 0) {
        p.images = p.images.map(img => formatImage(img, req));
    }

    if (p.owner && typeof p.owner === 'object') {
        p.owner = {
            id: p.owner._id,
            name: p.owner.name,
            image: formatImage(p.owner.avatar, req),
            rate: p.owner.rating || 0
        };
    }

    let isFavorite = false;
    if (req && req.user && p.favorites) {
        isFavorite = p.favorites.some(id => id.toString() === req.user._id.toString());
    }
    p.isFavorite = isFavorite;
    delete p.favorites;

    if (excludeReviews) {
        delete p.reviews;
    } else {
        if (p.reviews && p.reviews.length > 0) {
            p.reviews = p.reviews.map(r => formatReview(r, req));
        } else {
            p.reviews = [];
        }
    }

    return p;
};

const formatPaginatedResponse = (resourceName, data, count, page, limit) => {
    return {
        [resourceName]: data,
        page: Number(page),
        pages: Math.ceil(count / limit),
        total: count
    };
};

module.exports = {
    formatProduct,
    formatImage,
    formatPaginatedResponse,
    formatReview
};


