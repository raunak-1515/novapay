const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "USER" },

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    dob: { type: Date },
    address: { type: String },
    profilePictureUrl: { type: String },
    kycDocumentUrl: { type: String },
    kycStatus: {
      type: String,
      enum: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
      default: "UNVERIFIED"
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
