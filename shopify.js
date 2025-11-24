const { shopifyApi, ApiVersion } = require("@shopify/shopify-api");
const { webcrypto } = require('crypto');

if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}
require("@shopify/shopify-api/adapters/node");
require("dotenv").config();
const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.API_VERSION || ApiVersion.July25, // 2025-07
    storeDomain: process.env.SHOPIFY_STORE,
    hostName: process.env.HOST_NAME || "localhost:3000",
});

module.exports = shopify;
