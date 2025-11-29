const express = require("express");
const router = express.Router();
const controller = require("../controllers/jwtController");

router.post("/sign", controller.signJWT);

module.exports = router;

