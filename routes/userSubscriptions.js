const express = require("express");
const router = express.Router();
const userSubscriptionController = require("../controllers/userSubscriptionController");

// User subscription routes
router.post("/", userSubscriptionController.createSubscriptionForCustomer);

module.exports = router;

