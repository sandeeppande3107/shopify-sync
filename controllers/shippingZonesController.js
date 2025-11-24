const shopify = require("../shopify");

// ----------------------------------------------------
// Get all shipping zones
// ----------------------------------------------------
exports.getAllShippingZones = async (req, res) => {
    try {
        const client = new shopify.clients.Rest({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const response = await client.get({ path: "shipping_zones.json" });

        if (!response || !response.body) {
            throw new Error("No response received from Shopify API");
        }

        const shippingZones = response.body.shipping_zones || [];

        console.log(`Total shipping zones: ${shippingZones.length}`);
        res.json({
            shipping_zones: shippingZones,
            count: shippingZones.length
        });
    } catch (error) {
        console.error("Error fetching shipping zones:", error);
        res.status(500).json({ error: error.message });
    }
};

// ----------------------------------------------------
// Get single shipping zone by ID
// ----------------------------------------------------
exports.getShippingZone = async (req, res) => {
    try {
        const zoneId = req.params.id;
        const client = new shopify.clients.Rest({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        const response = await client.get({ path: `shipping_zones/${zoneId}.json` });

        if (!response || !response.body) {
            throw new Error("No response received from Shopify API");
        }

        const shippingZone = response.body.shipping_zone;

        if (!shippingZone) {
            return res.status(404).json({ error: "Shipping zone not found" });
        }

        res.json(shippingZone);
    } catch (error) {
        console.error("Error fetching shipping zone:", error);
        res.status(500).json({ error: error.message });
    }
};

// ----------------------------------------------------
// Calculate shipping rate for a specific address
// ----------------------------------------------------
exports.calculateShippingRate = async (req, res) => {
    try {
        const { countryCode, provinceCode, zip } = req.body;

        if (!countryCode) {
            return res.status(400).json({ error: "countryCode is required" });
        }

        const client = new shopify.clients.Rest({
            session: {
                accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
                shop: process.env.SHOPIFY_STORE,
            },
        });

        // Get all shipping zones
        const response = await client.get({ path: "shipping_zones.json" });
        const shippingZones = response.body.shipping_zones || [];

        if (shippingZones.length === 0) {
            return res.json({
                shipping_rate: null,
                message: "No shipping zones found"
            });
        }

        // Find matching shipping zone based on country/province
        const matchingZone = shippingZones.find(zone => {
            return zone.countries.some(country => {
                if (country.code !== countryCode) return false;

                // If province is specified, check if it matches
                if (provinceCode && country.provinces) {
                    return country.provinces.some(province =>
                        province.code === provinceCode
                    );
                }
                return true;
            });
        });

        if (!matchingZone) {
            return res.json({
                shipping_rate: null,
                message: "No matching shipping zone found for the provided address"
            });
        }

        // Get the cheapest shipping rate from the matching zone
        // Shipping rates are stored directly on the zone object
        let cheapestRate = null;
        let cheapestPrice = Infinity;

        // Check zone-level price-based shipping rates
        if (matchingZone.price_based_shipping_rates && Array.isArray(matchingZone.price_based_shipping_rates)) {
            for (const rate of matchingZone.price_based_shipping_rates) {
                const price = parseFloat(rate.price || 0);
                if (price < cheapestPrice) {
                    cheapestPrice = price;
                    cheapestRate = rate;
                }
            }
        }

        // Check zone-level weight-based shipping rates
        if (matchingZone.weight_based_shipping_rates && Array.isArray(matchingZone.weight_based_shipping_rates)) {
            for (const rate of matchingZone.weight_based_shipping_rates) {
                const price = parseFloat(rate.price || 0);
                if (price < cheapestPrice) {
                    cheapestPrice = price;
                    cheapestRate = rate;
                }
            }
        }

        // Also check country-level rates if they exist
        for (const country of matchingZone.countries || []) {
            if (country.code === countryCode) {
                // Check if country has direct shipping rates
                if (country.price_based_shipping_rates && Array.isArray(country.price_based_shipping_rates)) {
                    for (const rate of country.price_based_shipping_rates) {
                        const price = parseFloat(rate.price || 0);
                        if (price < cheapestPrice) {
                            cheapestPrice = price;
                            cheapestRate = rate;
                        }
                    }
                }
                if (country.weight_based_shipping_rates && Array.isArray(country.weight_based_shipping_rates)) {
                    for (const rate of country.weight_based_shipping_rates) {
                        const price = parseFloat(rate.price || 0);
                        if (price < cheapestPrice) {
                            cheapestPrice = price;
                            cheapestRate = rate;
                        }
                    }
                }

                // Check province-level rates if province is specified
                if (provinceCode && country.provinces && Array.isArray(country.provinces)) {
                    const province = country.provinces.find(p => p.code === provinceCode);
                    if (province) {
                        // Province has shipping_zone_id, but rates are at zone level
                        // If province has direct rates, check them
                        if (province.price_based_shipping_rates && Array.isArray(province.price_based_shipping_rates)) {
                            for (const rate of province.price_based_shipping_rates) {
                                const price = parseFloat(rate.price || 0);
                                if (price < cheapestPrice) {
                                    cheapestPrice = price;
                                    cheapestRate = rate;
                                }
                            }
                        }
                        if (province.weight_based_shipping_rates && Array.isArray(province.weight_based_shipping_rates)) {
                            for (const rate of province.weight_based_shipping_rates) {
                                const price = parseFloat(rate.price || 0);
                                if (price < cheapestPrice) {
                                    cheapestPrice = price;
                                    cheapestRate = rate;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (cheapestPrice === Infinity) {
            return res.json({
                shipping_rate: null,
                message: "No shipping rates found in matching zone"
            });
        }

        res.json({
            shipping_rate: cheapestRate,
            price: cheapestPrice,
            currency: matchingZone.countries[0]?.code || "USD",
            zone: {
                id: matchingZone.id,
                name: matchingZone.name
            }
        });
    } catch (error) {
        console.error("Error calculating shipping rate:", error);
        res.status(500).json({ error: error.message });
    }
};

