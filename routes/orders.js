const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");

// CRUD routes
router.get("/", ordersController.getAllOrders);
router.get("/:id", ordersController.getOrder);
router.post("/", ordersController.createOrder);
router.put("/:id", ordersController.updateOrder);
router.delete("/:id", ordersController.deleteOrder);

module.exports = router;
