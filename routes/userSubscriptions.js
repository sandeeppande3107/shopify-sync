const express = require("express");
const router = express.Router();
const userSubscriptionController = require("../controllers/userSubscriptionController");
const userSubsctionControllerAtomic = require("../controllers/userSubsctionControllerAtomic");

// User subscription routes
// router.post("/", userSubscriptionController.createSubscriptionForCustomer);
router.post("/", userSubsctionControllerAtomic.createSubscriptionForCustomer);
module.exports = router;

