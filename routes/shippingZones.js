const express = require("express");
const router = express.Router();
const shippingZonesController = require("../controllers/shippingZonesController");

// Shipping zones routes
router.get("/", shippingZonesController.getAllShippingZones);
router.get("/:id", shippingZonesController.getShippingZone);
router.post("/calculate-rate", shippingZonesController.calculateShippingRate);

module.exports = router;

