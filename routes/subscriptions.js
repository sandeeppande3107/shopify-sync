const express = require("express");
const router = express.Router();
const subscriptionsController = require("../controllers/subscriptionsController");

// Subscription/Selling Plan routes
router.get("/", subscriptionsController.getAllSellingPlanGroups);
router.get("/paginated", subscriptionsController.getPaginatedSellingPlanGroups);
router.get("/:id", subscriptionsController.getSellingPlanGroup);
router.post("/", subscriptionsController.createSellingPlanGroup);
router.delete("/:id", subscriptionsController.deleteSellingPlanGroup);

module.exports = router;
