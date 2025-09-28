const express = require("express");
const router = express.Router();
const controller = require("../controllers/productsController");

router.get("/", controller.getAllProducts);
router.get("/:id", controller.getProduct);
router.post("/", controller.createProduct);
router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);
router.get("/paginated/all", controller.getPaginatedProducts);

module.exports = router;
