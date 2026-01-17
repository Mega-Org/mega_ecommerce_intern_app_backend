const formatImage = (imagePath, req) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/${imagePath}`;
};

const formatProduct = (product, req) => {
    // If product is just an ID (not populated), return as is or null
    // But usually we expect an object.
    if (!product || typeof product !== 'object') return product;

    // Convert to object if it's a mongoose doc
    const p = product.toObject ? product.toObject() : product;

    // Format Main Image
    if (p.image) {
        p.image = formatImage(p.image, req);
    }

    // Format Images Array
    if (p.images && p.images.length > 0) {
        p.images = p.images.map(img => formatImage(img, req));
    }

    // Format Owner
    if (p.owner && typeof p.owner === 'object') {
        p.owner = {
            id: p.owner._id,
            name: p.owner.name,
            image: formatImage(p.owner.avatar, req),
            rate: p.owner.rating || 0
        };
    }

    // Format Reviews Avatars
    if (p.reviews && p.reviews.length > 0) {
        p.reviews = p.reviews.map(r => {
            if (r.user && typeof r.user === 'object') {
                // Clone to avoid mutation issues if necessary
                const u = { ...r.user };
                if (u.avatar) {
                    u.avatar = formatImage(u.avatar, req);
                }
                r.user = u;
            }
            return r;
        });
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
    formatPaginatedResponse
};
