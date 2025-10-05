const shopify = require("../shopify");

exports.getAllContacts = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: "customers" });
        res.json(response.body.customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getContact = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.get({ path: `customers/${req.params.id}` });
        res.json(response.body.customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createContact = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        console.log(req.body);
        console.log(typeof req.body);
        const response = await client.post({ path: "customers", data: req.body, type: "application/json" });
        res.status(201).json(response.body.customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateContact = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        const response = await client.put({ path: `customers/${req.params.id}`, data: { customer: req.body }, type: "application/json" });
        res.json(response.body.customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteContact = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({ session: { accessToken: process.env.SHOPIFY_ACCESS_TOKEN, shop: process.env.SHOPIFY_STORE } });
        await client.delete({ path: `customers/${req.params.id}` });
        res.json({ message: "Contact deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
