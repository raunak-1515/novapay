const express = require("express");
const { register, login } = require("../controllers/authController");
const { authRequired } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authRequired, (req, res) => {
  res.json(req.user);
});

module.exports = router;
