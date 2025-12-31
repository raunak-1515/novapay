const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "USER" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
