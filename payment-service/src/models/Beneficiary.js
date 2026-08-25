const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    beneficiaryUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    beneficiaryEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    nickname: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

beneficiarySchema.index(
  { ownerUserId: 1, beneficiaryEmail: 1 },
  { unique: true },
);

module.exports = mongoose.model("Beneficiary", beneficiarySchema);
