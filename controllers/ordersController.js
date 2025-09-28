const shopify = require("../shopify");

exports.getAllOrders = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: "orders" });
        res.json(response.body.orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: `orders/${req.params.id}` });
        res.json(response.body.order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Note: Orders are usually created during checkout
exports.createOrder = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.post({ path: "orders", data: { order: req.body }, type: "application/json" });
        res.status(201).json(response.body.order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.put({ path: `orders/${req.params.id}`, data: { order: req.body }, type: "application/json" });
        res.json(response.body.order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        await client.delete({ path: `orders/${req.params.id}` });
        res.json({ message: "Order deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
