const express = require("express");
const router = express.Router();
const controller = require("../controllers/themeConfigController");

router.get("/", controller.getAllThemeConfigs);
router.get("/themes", controller.getAllThemes);
router.get("/themes/:id", controller.getThemeById);
router.get("/:id", controller.getThemeConfig);

module.exports = router;

