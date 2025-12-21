const themeConfigService = require("../services/themeConfigService");

/**
 * Get all themes from the store
 */
exports.getAllThemes = async (req, res) => {
    try {
        const themes = await themeConfigService.getAllThemes();
        res.json(themes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get a specific theme by ID
 */
exports.getThemeById = async (req, res) => {
    try {
        const { id } = req.params;
        const theme = await themeConfigService.getThemeById(id);
        
        if (!theme) {
            return res.status(404).json({ error: "Theme not found" });
        }
        
        res.json(theme);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get theme configuration (published theme by default, or specific theme if ID provided)
 */
exports.getThemeConfig = async (req, res) => {
    try {
        const themeId = req.query.themeId || req.params.id || null;
        const themeConfig = await themeConfigService.getThemeConfig(themeId);
        
        if (!themeConfig) {
            return res.status(404).json({ error: "Theme configuration not found" });
        }
        
        res.json(themeConfig);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all theme configurations
 */
exports.getAllThemeConfigs = async (req, res) => {
    try {
        const themeConfigs = await themeConfigService.getAllThemeConfigs();
        res.json(themeConfigs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

