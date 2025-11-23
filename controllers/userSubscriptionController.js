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

// ----------------------------------------------------
// Mutation: Atomic Create Subscription Contract
// ----------------------------------------------------
const ATOMIC_CREATE = `
  mutation subscriptionContractAtomicCreate($input: SubscriptionContractAtomicCreateInput!) {
    subscriptionContractAtomicCreate(input: $input) {
      contract {
        id
        status
        customer {
          id
        }
        lines(first: 10) {
          nodes {
            id
            quantity
            productId
            variantId
            variantTitle
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

// ----------------------------------------------------
// MAIN: Create subscription for customer (Atomic)
// ----------------------------------------------------
exports.createSubscriptionForCustomer = async (req, res) => {
    try {
        const { customerId, currency, lines, billingPolicy, deliveryPolicy, paymentMethodId, nextBillingDate, status, deliveryPrice, deliveryMethod } = req.body;

        if (!customerId) {
            return res.status(400).json({ error: "Customer ID is required" });
        }

        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: "At least one subscription line is required" });
        }

        if (!billingPolicy) {
            return res.status(400).json({ error: "billingPolicy is required" });
        }

        if (!deliveryPolicy) {
            return res.status(400).json({ error: "deliveryPolicy is required" });
        }

        // Validate each line
        for (const line of lines) {
            if (!line.variantId) {
                return res.status(400).json({ error: "variantId is required for each line" });
            }
        }

        const client = createGraphqlClient();

        // Prepare subscription lines - using productVariantId and currentPrice
        const subscriptionLines = lines.map(line => {
            const lineInput = {
                productVariantId: normalizeGid("ProductVariant", line.variantId),
                quantity: line.quantity || 1
            };

            // Add currentPrice only if it's a valid number (not null, not undefined)
            if (line.currentPrice !== undefined && line.currentPrice !== null && typeof line.currentPrice === 'number') {
                lineInput.currentPrice = line.currentPrice;
            }

            // Add sellingPlanId if provided (optional)
            if (line.sellingPlanId) {
                lineInput.sellingPlanId = normalizeGid("SellingPlan", line.sellingPlanId);
            }

            return { line: lineInput };
        });

        // Unwrap recurring format if present (convert from {recurring: {interval, intervalCount}} to {interval, intervalCount})
        const normalizePolicy = (policy) => {
            if (policy && policy.recurring) {
                return {
                    interval: policy.recurring.interval,
                    intervalCount: policy.recurring.intervalCount,
                    ...(policy.recurring.minCycles !== undefined && { minCycles: policy.recurring.minCycles })
                };
            }
            return policy;
        };

        const normalizedBillingPolicy = normalizePolicy(billingPolicy);
        const normalizedDeliveryPolicy = normalizePolicy(deliveryPolicy);

        // Build the input structure
        const input = {
            customerId: normalizeGid("Customer", customerId),
            currencyCode: currency || "USD",
            lines: subscriptionLines,
            contract: {
                status: status || "ACTIVE",
                billingPolicy: normalizedBillingPolicy,
                deliveryPolicy: normalizedDeliveryPolicy,
                deliveryPrice: 0
            }
        };

        // Add optional fields - only if they have valid values (not null, not undefined, not empty)
        if (nextBillingDate && nextBillingDate !== null && nextBillingDate !== undefined && nextBillingDate !== '') {
            input.nextBillingDate = nextBillingDate;
        }

        if (paymentMethodId) {
            input.contract.paymentMethodId = normalizeGid("CustomerPaymentMethod", paymentMethodId);
        }

        if (deliveryPrice !== undefined) {
            input.contract.deliveryPrice = deliveryPrice;
        }

        if (deliveryMethod) {
            input.contract.deliveryMethod = deliveryMethod;
        }

        console.log("📌 Creating subscription contract atomically…");
        console.log("Input:", JSON.stringify(input, null, 2));

        const response = await client.request(ATOMIC_CREATE, { variables: { input } });

        if (!response || !response.data || !response.data.subscriptionContractAtomicCreate) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        const result = response.data.subscriptionContractAtomicCreate;

        if (result.userErrors && result.userErrors.length > 0) {
            console.error("Subscription Create Errors:", result.userErrors);
            return res.status(400).json({
                error: "Failed to create subscription contract",
                userErrors: result.userErrors
            });
        }

        const contract = result.contract;

        console.log("🎉 Subscription Contract Created:", contract);

        res.status(201).json({
            message: "Subscription created successfully",
            contract: contract
        });
    } catch (error) {
        console.error("❌ Error creating subscription:", error);
        res.status(500).json({ error: error.message });
    }
};
