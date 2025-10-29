const shopify = require("../shopify");

exports.getAllSellingPlanGroups = async (req, res) => {
    try {
        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const query = `
            query getSellingPlans($first: Int!) {
                sellingPlanGroups(first: $first) {
                    edges {
                        node {
                            id
                            name
                            productVariants(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        price
                                        sku
                                        product {
                                            id
                                            title
                                        }
                                    }
                                }
                            }
                            sellingPlans(first: 10) {
                                edges {
                                    node {
                                        id
                                        name
                                        description
                                        options
                                        pricingPolicies {
                                            ... on SellingPlanFixedPricingPolicy {
                                                adjustmentType
                                            }
                                            ... on SellingPlanRecurringPricingPolicy {
                                                adjustmentType
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await client.request(query, { variables: { first: 50 } });
        if (!response || !response.data) {
            throw new Error("No response received from GraphQL client");
        }

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
        }


        if (!response.data.sellingPlanGroups) {
            throw new Error("sellingPlanGroups not found in response data");
        }

        const sellingPlanGroups = response.data.sellingPlanGroups.edges.map(edge => edge.node);

        console.log(`Total selling plan groups: ${sellingPlanGroups.length}`);
        res.json(sellingPlanGroups);
    } catch (error) {
        console.error("Error fetching selling plans:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get selling plan groups with cursor-based pagination
exports.getPaginatedSellingPlanGroups = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const after = req.query.after || undefined;

        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const query = `
            query getSellingPlans($first: Int!, $after: String) {
                sellingPlanGroups(first: $first, after: $after) {
                    edges {
                        node {
                            id
                            name
                            productVariants(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        price
                                        sku
                                        product {
                                            id
                                            title
                                        }
                                    }
                                }
                            }
                            sellingPlans(first: 10) {
                                edges {
                                    node {
                                        id
                                        name
                                        description
                                        options
                                        pricingPolicies {
                                            ... on SellingPlanFixedPricingPolicy {
                                                adjustmentType
                                            }
                                            ... on SellingPlanRecurringPricingPolicy {
                                                adjustmentType
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                    }
                }
            }
        `;

        const response = await client.request(query, { variables: { first: limit, after } });

        console.log("Paginated GraphQL Response:", JSON.stringify(response, null, 2));

        if (!response || !response.data) {
            throw new Error("No response received from GraphQL client");
        }

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
        }

        if (!response.data) {
            throw new Error("No data in GraphQL response");
        }

        if (!response.data.sellingPlanGroups) {
            throw new Error("sellingPlanGroups not found in response data");
        }

        const sellingPlanGroups = response.data.sellingPlanGroups.edges.map(edge => edge.node);
        const pageInfo = response.data.sellingPlanGroups.pageInfo;

        res.json({
            selling_plan_groups: sellingPlanGroups,
            page_info: pageInfo,
            next_cursor: pageInfo.hasNextPage ? pageInfo.endCursor : null,
        });
    } catch (err) {
        console.error("Error fetching paginated selling plan groups:", err);
        res.status(500).json({ error: err.message });
    }
};


exports.getSellingPlanGroup = async (req, res) => {
    try {
        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const query = `
            query getSellingPlanGroup($id: ID!) {
                sellingPlanGroup(id: $id) {
                    id
                    name
                    productVariants(first: 50) {
                        edges {
                            node {
                                id
                                title
                                price
                                sku
                                product {
                                    id
                                    title
                                }
                            }
                        }
                    }
                    productVariantCount
                    sellingPlans(first: 10) {
                        edges {
                            node {
                                id
                                name
                                description
                                options
                                productVariantIds
                                pricingPolicies {
                                    ... on SellingPlanFixedPricingPolicy {
                                        adjustmentType
                                    }
                                    ... on SellingPlanRecurringPricingPolicy {
                                        adjustmentType
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await client.request(query, { variables: { id: req.params.id } });

        console.log("Get Subscription GraphQL Response:", JSON.stringify(response, null, 2));

        if (!response || !response.data) {
            throw new Error("No response received from GraphQL client");
        }

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
        }

        if (!response.data) {
            throw new Error("No data in GraphQL response");
        }

        if (!response.data.sellingPlanGroup) {
            return res.status(404).json({ error: "Selling plan group not found" });
        }

        res.json(response.data.sellingPlanGroup);
    } catch (error) {
        console.error("Error fetching selling plan group:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.createSellingPlanGroup = async (req, res) => {
    try {
        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const mutation = `
            mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
                sellingPlanGroupCreate(input: $input, resources: $resources) {
                    sellingPlanGroup {
                        id
                        name
                        sellingPlans(first: 10) {
                            edges {
                                node {
                                    id
                                    name
                                    description
                                    options
                                    pricingPolicies {
                                        ... on SellingPlanFixedPricingPolicy {
                                            adjustmentType
                                        }
                                        ... on SellingPlanRecurringPricingPolicy {
                                            adjustmentType
                                        }
                                    }
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await client.request(mutation, { variables: { input: req.body.input, resources: req.body.resources } });


        if (!response) {
            throw new Error("No response received from GraphQL client");
        }

        console.log(response.data);

        if (!response.data) {
            throw new Error("Response body is undefined");
        }

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
        }

        if (!response.data) {
            console.error("No data in response:", response.data);
            throw new Error("No data field in GraphQL response");
        }

        if (!response.data.sellingPlanGroupCreate) {
            console.error("sellingPlanGroupCreate not found in response data:", response.data);
            throw new Error("sellingPlanGroupCreate not found in response data");
        }

        if (response.data.sellingPlanGroupCreate.userErrors && response.data.sellingPlanGroupCreate.userErrors.length > 0) {
            return res.status(400).json({
                error: "Selling plan group creation failed",
                userErrors: response.data.sellingPlanGroupCreate.userErrors
            });
        }

        const sellingPlanGroup = response.data.sellingPlanGroupCreate.sellingPlanGroup;

        console.log("Selling plan group created successfully:", sellingPlanGroup);
        res.status(201).json(sellingPlanGroup);
    } catch (error) {
        console.error("Error creating selling plan group:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSellingPlanGroup = async (req, res) => {
    try {
        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const mutation = `
            mutation sellingPlanGroupDelete($id: ID!) {
                sellingPlanGroupDelete(id: $id) {
                    deletedSellingPlanGroupId
                }
            }
        `;

        const response = await client.request(mutation, { variables: { id: `gid://shopify/SellingPlanGroup/${req.params.id}` } });

        console.log("Delete Subscription GraphQL Response:", JSON.stringify(response, null, 2));

        if (!response || !response.data) {
            throw new Error("No response received from GraphQL client");
        }
        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
        }

        if (!response.data) {
            throw new Error("No data in GraphQL response");
        }

        if (!response.data.sellingPlanGroupDelete) {
            throw new Error("sellingPlanGroupDelete not found in response data");
        }

        const deletedSellingPlanGroupId = response.data.sellingPlanGroupDelete.deletedSellingPlanGroupId;

        console.log("Selling plan group deleted successfully:", deletedSellingPlanGroupId);
        res.status(200).json({ message: "Selling plan group deleted successfully" });
    } catch (error) {
        console.error("Error deleting selling plan group:", error);
        res.status(500).json({ error: error.message });
    }
};