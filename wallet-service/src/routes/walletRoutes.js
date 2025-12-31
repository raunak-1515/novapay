const express = require("express");
const { authRequired } = require("../middlewares/authMiddleware");
const {
  createWallet,
  getBalance,
  topUp,
} = require("../controllers/walletController");
const router = express.Router();

router.post("/create", authRequired, createWallet);
router.get("/balance", authRequired, getBalance);
router.post("/topup", authRequired, topUp);

module.exports = router;
