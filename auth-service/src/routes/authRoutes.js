const express = require("express");

const { authRequired } = require("../middlewares/authMiddleware");
const upload = require("../config/multer");
const {
  register,
  login,
  getUserByEmail,
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadKyc,
  verifyKyc
} = require("../controllers/authController");


const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authRequired, (req, res) => {
  res.json(req.user);
});

router.get("/user", getUserByEmail);

router.get("/profile", authRequired, getProfile);
router.put("/profile", authRequired, updateProfile);

// The 'upload.single("file")' intercepts the request and saves the file to disk!
router.post("/profile/upload-avatar", authRequired, upload.single("file"), uploadAvatar);
router.post("/kyc/upload", authRequired, upload.single("file"), uploadKyc);

// A secret route to simulate an admin verifying the document
router.post("/admin/verify-kyc", verifyKyc);


module.exports = router;
