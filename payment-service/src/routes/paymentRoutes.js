const express = require("express");
const { transfer, getHistory } = require("../controllers/paymentController");
const {
  addBeneficiary,
  getBeneficiaries,
  deleteBeneficiary,
} = require("../controllers/beneficiaryController");
const { authRequired } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/transfer", authRequired, transfer);
router.get("/history", authRequired, getHistory);

router.post("/beneficiaries", authRequired, addBeneficiary);
router.get("/beneficiaries", authRequired, getBeneficiaries);
router.delete("/beneficiaries/:id", authRequired, deleteBeneficiary);

module.exports = router;
