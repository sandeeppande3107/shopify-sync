const jwt = require("jsonwebtoken");

exports.signJWT = async (req, res) => {
    try {
        const { payload, secret, expiresIn, algorithm = "HS256" } = req.body;

        // Validate required fields
        if (!payload) {
            return res.status(400).json({ error: "payload is required" });
        }

        if (!secret) {
            return res.status(400).json({ error: "secret is required" });
        }

        // Sign the JWT
        const token = jwt.sign(payload, secret, {
            expiresIn: expiresIn || "1h",
            algorithm: algorithm,
        });

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

