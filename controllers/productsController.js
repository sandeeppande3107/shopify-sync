const shopify = require("../shopify");

exports.getAllProducts = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: "products" });
        const countResp = await client.get({ path: `products/count` });
        const total = countResp?.body?.count || 0;
        console.log(`Total products: ${total}`);
        res.json(response.body.products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get products with cursor-based pagination
exports.getPaginatedProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;       // items per page
        const pageInfo = req.query.page_info || undefined;   // cursor from Shopify

        const params = { limit };
        if (pageInfo) params.page_info = String(pageInfo);

        const client = new shopify.clients.Rest({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        // Make request to /products.json
        const response = await client.get({
            path: "products",
            query: params,
        });

        // Extract next page cursor from Shopify's "link" header
        console.log("Response Headers:", response.headers);
        const linkHeader = response.headers["link"] || response.headers["Link"] || "";
        let nextPageInfo;
        const match = linkHeader[0].match(/page_info=([^&>]+)>; rel="next"/);
        if (match) nextPageInfo = match[1];

        res.json({
            products: response.body.products || response.body,
            next_page_info: nextPageInfo,
        });
    } catch (err) {
        console.error("Error fetching paginated products:", err);
        res.status(500).json({ error: err.message });
    }
};


exports.getProduct = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: `products/${req.params.id}` });
        res.json(response.body.product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.post({ path: "products", data: { product: req.body }, type: "application/json" });
        res.status(201).json(response.body.product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



exports.updateProduct = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.put({ path: `products/${req.params.id}`, data: { product: req.body }, type: "application/json" });
        res.json(response.body.product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        await client.delete({ path: `products/${req.params.id}` });
        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
