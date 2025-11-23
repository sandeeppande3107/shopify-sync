const express = require("express");
const router = express.Router();
const contactsController = require("../controllers/contactsController");

// CRUD routes
router.get("/", contactsController.getAllContacts);
router.post("/", contactsController.createContact);

// Payment method routes
router.post("/:id/payment-methods", contactsController.createPaymentMethod);
router.post("/:id/payment-methods/link", contactsController.linkPaymentMethod);
router.get("/payment-methods/:paymentMethodId/update-url", contactsController.getPaymentMethodUpdateUrl);
router.get("/payment-methods/:paymentMethodId/update-redirect", contactsController.redirectToPaymentMethodUpdate);

router.get("/:id", contactsController.getContact);
router.put("/:id", contactsController.updateContact);
router.delete("/:id", contactsController.deleteContact);

module.exports = router;
