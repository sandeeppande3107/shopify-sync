const shopify = require("../shopify");

const createGraphqlClient = () =>
    new shopify.clients.Graphql({
        session: {
            accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
            shop: process.env.SHOPIFY_STORE,
        },
    });

const normalizeGid = (type, id) => {
    if (!id) {
        return id;
    }
    return id.startsWith("gid://") ? id : `gid://shopify/${type}/${id}`;
};

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

exports.createPaymentMethod = async (req, res) => {
    try {
        const rawCustomerId = req.params.id || req.body.customerId;
        const {
            paymentMethod = { type: "CARD" },
            origin = { channel: "ONLINE_STORE" },
            successRedirectUrl,
            cancelRedirectUrl,
            test,
        } = req.body;

        if (!rawCustomerId) {
            return res.status(400).json({ error: "Customer ID is required" });
        }

        const client = createGraphqlClient();
        const mutation = `
            mutation customerPaymentMethodRemoteCreate($input: CustomerPaymentMethodRemoteCreateInput!) {
                customerPaymentMethodRemoteCreate(input: $input) {
                    customerPaymentMethod {
                        id
                        status
                    }
                    setupIntent {
                        id
                        nextAction {
                            redirectUrl
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const input = {
            customerId: normalizeGid("Customer", rawCustomerId),
            paymentMethod,
            origin,
        };

        if (successRedirectUrl) {
            input.successRedirectUrl = successRedirectUrl;
        }

        if (cancelRedirectUrl) {
            input.cancelRedirectUrl = cancelRedirectUrl;
        }

        if (typeof test === "boolean") {
            input.test = test;
        }

        const response = await client.request(mutation, { variables: { input } });

        if (!response || !response.data || !response.data.customerPaymentMethodRemoteCreate) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        const result = response.data.customerPaymentMethodRemoteCreate;

        if (result.userErrors && result.userErrors.length > 0) {
            return res.status(400).json({
                error: "Failed to initiate payment method setup",
                userErrors: result.userErrors,
            });
        }

        const redirectUrl = result.setupIntent?.nextAction?.redirectUrl;

        if (!redirectUrl) {
            return res.status(500).json({
                error: "Shopify did not return a redirect URL for payment method setup",
            });
        }

        res.status(201).json({
            message: "Payment method setup initiated",
            setupIntentId: result.setupIntent.id,
            redirectUrl,
        });
    } catch (error) {
        console.error("Error initiating payment method setup:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.linkPaymentMethod = async (req, res) => {
    try {
        const { remoteReference, billingAddress, test } = req.body;
        const rawCustomerId = req.params.id || req.body.customerId;

        if (!rawCustomerId) {
            return res.status(400).json({ error: "Customer ID is required" });
        }

        if (!remoteReference || typeof remoteReference !== "object") {
            return res.status(400).json({ error: "remoteReference payload is required" });
        }

        const client = createGraphqlClient();
        const mutation = `
            mutation customerPaymentMethodRemoteCreate($customerId: ID!, $remoteReference: CustomerPaymentMethodRemoteInput!, $billingAddress: MailingAddressInput, $test: Boolean) {
                customerPaymentMethodRemoteCreate(customerId: $customerId, remoteReference: $remoteReference, billingAddress: $billingAddress, test: $test) {
                    customerPaymentMethod {
                        id
                        instrument {
                            __typename
                            ... on CustomerPaymentMethodCreditCard {
                                brand
                                lastDigits
                                expMonth
                                expYear
                            }
                            ... on CustomerPaymentMethodPaypalBillingAgreement {
                                billingAgreementId
                            }
                        }
                        billingAddress {
                            address1
                            city
                            country
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            customerId: normalizeGid("Customer", rawCustomerId),
            remoteReference,
        };

        if (billingAddress) {
            variables.billingAddress = billingAddress;
        }

        if (typeof test === "boolean") {
            variables.test = test;
        }

        const response = await client.request(mutation, { variables });

        if (!response || !response.data || !response.data.customerPaymentMethodRemoteCreate) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        const result = response.data.customerPaymentMethodRemoteCreate;

        if (result.userErrors && result.userErrors.length > 0) {
            return res.status(400).json({
                error: "Failed to link payment method",
                userErrors: result.userErrors,
            });
        }

        res.status(201).json({
            message: "Payment method linked successfully",
            paymentMethod: result.customerPaymentMethod,
        });
    } catch (error) {
        console.error("Error linking payment method:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPaymentMethodUpdateUrl = async (req, res) => {
    try {
        const { paymentMethodId } = req.params;
        if (!paymentMethodId) {
            return res.status(400).json({ error: "Payment method ID is required" });
        }

        const client = createGraphqlClient();
        const mutation = `
            mutation customerPaymentMethodGetUpdateUrl($customerPaymentMethodId: ID!) {
                customerPaymentMethodGetUpdateUrl(customerPaymentMethodId: $customerPaymentMethodId) {
                    updatePaymentMethodUrl
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            customerPaymentMethodId: normalizeGid("CustomerPaymentMethod", paymentMethodId),
        };

        const response = await client.request(mutation, { variables });

        if (!response || !response.data || !response.data.customerPaymentMethodGetUpdateUrl) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        const result = response.data.customerPaymentMethodGetUpdateUrl;

        if (result.userErrors && result.userErrors.length > 0) {
            return res.status(400).json({
                error: "Failed to retrieve payment method update URL",
                userErrors: result.userErrors,
            });
        }

        if (!result.updatePaymentMethodUrl) {
            return res.status(404).json({ error: "No update URL returned for this payment method" });
        }

        res.json({ updatePaymentMethodUrl: result.updatePaymentMethodUrl });
    } catch (error) {
        console.error("Error fetching payment method update URL:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.redirectToPaymentMethodUpdate = async (req, res) => {
    try {
        const { paymentMethodId } = req.params;
        if (!paymentMethodId) {
            return res.status(400).json({ error: "Payment method ID is required" });
        }

        const client = createGraphqlClient();
        const mutation = `
            mutation customerPaymentMethodGetUpdateUrl($customerPaymentMethodId: ID!) {
                customerPaymentMethodGetUpdateUrl(customerPaymentMethodId: $customerPaymentMethodId) {
                    updatePaymentMethodUrl
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            customerPaymentMethodId: normalizeGid("CustomerPaymentMethod", paymentMethodId),
        };

        const response = await client.request(mutation, { variables });

        if (!response || !response.data || !response.data.customerPaymentMethodGetUpdateUrl) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        const result = response.data.customerPaymentMethodGetUpdateUrl;

        if (result.userErrors && result.userErrors.length > 0) {
            return res.status(400).json({
                error: "Failed to retrieve payment method update URL",
                userErrors: result.userErrors,
            });
        }

        if (!result.updatePaymentMethodUrl) {
            return res.status(404).json({ error: "No update URL returned for this payment method" });
        }

        res.redirect(result.updatePaymentMethodUrl);
    } catch (error) {
        console.error("Error redirecting to payment method update URL:", error);
        res.status(500).json({ error: error.message });
    }
};
