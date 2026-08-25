const express = require("express");
const { authRequired } = require("../middlewares/authMiddleware");
const {
  createWallet,
  getBalance,
  topUp,
  debitWallet,
  creditWallet,
  provisionWallet,
  addBankAccount,
  getBankAccounts,
  deleteBankAccount,
} = require("../controllers/walletController");
const {
  requireInternalService,
} = require("../middlewares/internalServiceMiddleware");
const router = express.Router();

router.post("/create", authRequired, createWallet);
router.post("/provision", requireInternalService, provisionWallet);
router.get("/balance", authRequired, getBalance);
router.post("/topup", authRequired, topUp);
router.post("/debit", authRequired, requireInternalService, debitWallet);
router.post("/credit", requireInternalService, creditWallet);

router.post("/bank-accounts", authRequired, addBankAccount);
router.get("/bank-accounts", authRequired, getBankAccounts);
router.delete("/bank-accounts/:id", authRequired, deleteBankAccount);

module.exports = router;
