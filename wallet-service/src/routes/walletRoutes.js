const express = require("express");
const { authRequired } = require("../middlewares/authMiddleware");
const {
  createWallet,
  getBalance,
  topUp,
  debitWallet,
  creditWallet,
} = require("../controllers/walletController");
const router = express.Router();

router.post("/create", authRequired, createWallet);
router.get("/balance", authRequired, getBalance);
router.post("/topup", authRequired, topUp);
router.post("/debit", authRequired, debitWallet);
router.post("/credit", authRequired, creditWallet);

module.exports = router;
