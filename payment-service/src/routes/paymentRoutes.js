const express = require("express");
const { transfer } = require("../controllers/paymentController");
const { authRequired } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/transfer", authRequired, transfer);

module.exports = router;
