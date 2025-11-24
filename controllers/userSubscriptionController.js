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
// Mutation: Create subscription draft
// ----------------------------------------------------
const CREATE_DRAFT = `
  mutation subscriptionContractCreate($input: SubscriptionContractCreateInput!) {
    subscriptionContractCreate(input: $input) {
      draft {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ----------------------------------------------------
// Mutation: Add line to subscription draft
// ----------------------------------------------------
const ADD_LINE = `
  mutation subscriptionDraftLineAdd($draftId: ID!, $input: SubscriptionLineInput!) {
    subscriptionDraftLineAdd(draftId: $draftId, input: $input) {
      draft {
        id
        lines(first: 20) {
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
// Mutation: Commit draft to create final contract
// ----------------------------------------------------
const COMMIT_DRAFT = `
  mutation subscriptionDraftCommit($draftId: ID!) {
    subscriptionDraftCommit(draftId: $draftId) {
      contract {
        id
        status
        customer {
          id
        }
        lines(first: 20) {
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
// MAIN: Create subscription for customer (Non-Atomic)
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

        // Step 1: Create subscription draft
        console.log("📌 Step 1: Creating subscription draft…");

        const draftInput = {
            contract: {
                billingPolicy: normalizedBillingPolicy,
                deliveryPolicy: normalizedDeliveryPolicy
            }
        };

        // Add required fields
        draftInput.customerId = normalizeGid("Customer", customerId);
        draftInput.currencyCode = currency || "USD";

        // Status is required - use provided status or default to ACTIVE
        draftInput.contract.status = (status && status.trim() !== '') ? status : "ACTIVE";

        if (paymentMethodId) {
            draftInput.contract.paymentMethodId = normalizeGid("CustomerPaymentMethod", paymentMethodId);
        }

        // Delivery price is required - must be a number (default to 0 if not provided)
        draftInput.contract.deliveryPrice = (deliveryPrice !== undefined && typeof deliveryPrice === 'number') ? deliveryPrice : 0;

        if (deliveryMethod) {
            draftInput.contract.deliveryMethod = deliveryMethod;
        }

        // Add nextBillingDate at root level if provided
        if (nextBillingDate && nextBillingDate !== null && nextBillingDate !== undefined && nextBillingDate !== '') {
            draftInput.nextBillingDate = nextBillingDate;
        }

        const draftResponse = await client.request(CREATE_DRAFT, { variables: { input: draftInput } });

        if (!draftResponse || !draftResponse.data || !draftResponse.data.subscriptionContractCreate) {
            throw new Error("Unexpected response from Shopify GraphQL API");
        }

        if (draftResponse.data.subscriptionContractCreate.userErrors?.length > 0) {
            console.error("Draft Create Errors:", draftResponse.data.subscriptionContractCreate.userErrors);
            return res.status(400).json({
                error: "Failed to create subscription draft",
                userErrors: draftResponse.data.subscriptionContractCreate.userErrors
            });
        }

        const draftId = draftResponse.data.subscriptionContractCreate.draft.id;
        console.log("✅ Draft created:", draftId);

        // Step 2: Add lines to the draft
        console.log("📌 Step 2: Adding lines to draft…");

        const addedLines = [];
        for (const line of lines) {
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

            const addLineResponse = await client.request(ADD_LINE, {
                variables: {
                    draftId: draftId,
                    input: lineInput
                }
            });

            if (!addLineResponse || !addLineResponse.data || !addLineResponse.data.subscriptionDraftLineAdd) {
                throw new Error("Unexpected response from Shopify GraphQL API when adding line");
            }

            if (addLineResponse.data.subscriptionDraftLineAdd.userErrors?.length > 0) {
                console.error("Add Line Errors:", addLineResponse.data.subscriptionDraftLineAdd.userErrors);
                return res.status(400).json({
                    error: `Failed to add line to draft: ${line.variantId}`,
                    userErrors: addLineResponse.data.subscriptionDraftLineAdd.userErrors
                });
            }

            addedLines.push(addLineResponse.data.subscriptionDraftLineAdd.draft);
            console.log(`✅ Line added: ${line.variantId}`);
        }

        // Step 3: Commit the draft to create the final contract
        console.log("📌 Step 3: Committing draft to create final contract…");

        const commitResponse = await client.request(COMMIT_DRAFT, { variables: { draftId: draftId } });

        if (!commitResponse || !commitResponse.data || !commitResponse.data.subscriptionDraftCommit) {
            throw new Error("Unexpected response from Shopify GraphQL API when committing draft");
        }

        if (commitResponse.data.subscriptionDraftCommit.userErrors?.length > 0) {
            console.error("Commit Errors:", commitResponse.data.subscriptionDraftCommit.userErrors);
            return res.status(400).json({
                error: "Failed to commit subscription draft",
                userErrors: commitResponse.data.subscriptionDraftCommit.userErrors
            });
        }

        const contract = commitResponse.data.subscriptionDraftCommit.contract;

        console.log("🎉 Subscription Contract Created:", contract);

        res.status(201).json({
            message: "Subscription created successfully",
            contract: contract,
            draftId: draftId
        });
    } catch (error) {
        console.error("❌ Error creating subscription:", error);
        res.status(500).json({ error: error.message });
    }
};
