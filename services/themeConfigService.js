const shopify = require("../shopify");

/**
 * Service for fetching theme configuration from Shopify store
 */
class ThemeConfigService {
    /**
     * Get all themes from the store
     * @returns {Promise<Object>} List of themes
     */
    async getAllThemes() {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                    shop: process.env.SHOPIFY_STORE,
                },
            });

            const response = await client.get({ path: "themes" });
            return response.body.themes || [];
        } catch (error) {
            throw new Error(`Failed to fetch themes: ${error.message}`);
        }
    }

    /**
     * Get a specific theme by ID
     * @param {string} themeId - Theme ID
     * @returns {Promise<Object>} Theme configuration
     */
    async getThemeById(themeId) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                    shop: process.env.SHOPIFY_STORE,
                },
            });

            const response = await client.get({ path: `themes/${themeId}` });
            return response.body.theme || null;
        } catch (error) {
            throw new Error(`Failed to fetch theme ${themeId}: ${error.message}`);
        }
    }

    /**
     * Get theme configuration using GraphQL
     * @param {string} themeId - Optional theme ID (if not provided, gets published theme)
     * @returns {Promise<Object>} Theme configuration
     */
    async getThemeConfig(themeId = null) {
        try {
            const client = new shopify.clients.Graphql({
                session: {
                    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                    shop: process.env.SHOPIFY_STORE,
                },
            });
            console.log(themeId);
            const query = themeId
                ? `
                    query getTheme($id: ID!) {
                        theme(id: $id) {
                            id
                            name
                            role
                            createdAt
                            updatedAt
                        }
                    }
                `
                : `
                    query getPublishedTheme {
                        themes(first: 1, query: "role:main") {
                            edges {
                                node {
                                    id
                                    name
                                    role
                                    createdAt
                                    updatedAt
                                }
                            }
                        }
                    }
                `;

            const variables = themeId ? { id: `gid://shopify/OnlineStoreTheme/${themeId}` } : {};
            const response = await client.request(query, { variables });

            if (themeId) {
                return response.data?.theme || null;
            } else {
                return response.data?.themes?.edges?.[0]?.node || null;
            }
        } catch (error) {
            throw new Error(`Failed to fetch theme config: ${error.message}`);
        }
    }

    /**
     * Get all themes with their configurations
     * @returns {Promise<Array>} Array of theme configurations
     */
    async getAllThemeConfigs() {
        try {

            const client = new shopify.clients.Graphql({
                session: {
                    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                    shop: process.env.SHOPIFY_STORE,
                },
            });

            const query = `
      query getAllThemes {
        themes(first: 10, roles: [MAIN]) {
          edges {
            node {
              id
              name
              role
              createdAt
              updatedAt
              files(first: 300, filenames: ["*settings_data.json"]) {
                edges {
                  node {
                    filename
                    body{
                        ... on OnlineStoreThemeFileBodyText {
                            content
                        }
                    }
                    contentType
                  }
                }
              }
            }
          }
        }
      }
    `;

            const response = await client.request(query);
            return (
                response.data?.themes?.edges?.map(edge => {
                    const theme = edge.node;

                    const settingsFile = theme.files.edges.find(
                        f => f.node.filename.endsWith("settings_data.json")
                    )?.node;

                    let colors = null;
                    if (settingsFile?.body?.content) {
                        colors = extractThemeColors(theme.id, settingsFile.body.content);
                    }

                    return {
                        id: theme.id,
                        name: theme.name,
                        role: theme.role,
                        createdAt: theme.createdAt,
                        updatedAt: theme.updatedAt,
                        colors
                    };
                }) || []
            );
        } catch (error) {
            throw new Error(`Failed to fetch all theme configs: ${error.message}`);
        }
    }
}

function extractThemeColors(id, settingsDataJson) {
    settingsDataJson = cleanSettingsContent(settingsDataJson);
    let parsed;

    try {
        parsed = JSON.parse(settingsDataJson);
        //if parsed current logo is present, call assets service to get the logo url
        if (parsed.current.logo) {
            console.log(id, parsed.current.logo);
            const logoUrl = getAssetUrl(id, parsed.current.logo);
            parsed.current.logo = logoUrl;
        }
    } catch (e) {
        return null;
    }

    return parsed;
}

function cleanSettingsContent(content) {
    if (!content || typeof content !== "string") return null;

    // Remove /* ... */ comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, "");

    // Trim whitespace / newlines
    content = content.trim();

    return content;
}

async function getAssetUrl(themeId, shopifyUrl) {
    try {
        // Extract the filename from shopify://shop_images/...
        const match = shopifyUrl.match(/^shopify:\/\/shop_images\/(.+)$/);
        if (!match) throw new Error("Invalid Shopify URL format");
        const filename = match[1];
        const assetKey = `assets/${filename}`;

        // Initialize GraphQL client
        const client = new shopify.clients.Graphql({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        // GraphQL query
        const query = `
            query getAssetUrl($themeId: ID!, $assetKey: String!) {
                theme(id: $themeId) {
                    asset(key: $assetKey) {
                        publicUrl
                    }
                }
            }
        `;

        const variables = {
            themeId: themeId,
            assetKey
        };

        const response = await client.query({ data: { query, variables } });

        const publicUrl = response?.body?.data?.theme?.asset?.publicUrl;
        if (!publicUrl) throw new Error("Asset not found or missing permissions");

        return publicUrl;
    } catch (error) {
        throw new Error(`Failed to fetch asset URL for ${shopifyUrl}: ${error.message}`);
    }
}


module.exports = new ThemeConfigService();

