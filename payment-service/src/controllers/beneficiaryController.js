const axios = require("axios");
const Beneficiary = require("../models/Beneficiary");

exports.addBeneficiary = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const { beneficiaryEmail, nickname } = req.body;

    const normalizedEmail = beneficiaryEmail.trim().toLowerCase();
    const trimmedNickname = nickname ? nickname.trim() : "";
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Beneficiary email is required" });
    }
    const userResponse = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/user`,
      { params: { email: normalizedEmail } },
    );

    const beneficiaryUser = userResponse.data.user;
    if (String(beneficiaryUser._id) === String(ownerUserId)) {
      return res
        .status(400)
        .json({ message: "You cannot add yourself as a beneficiary" });
    }

    const existing = await Beneficiary.findOne({
      ownerUserId,
      beneficiaryEmail: normalizedEmail,
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Beneficiary with this email already exists" });

    const beneficiary = await Beneficiary.create({
      ownerUserId,
      beneficiaryUserId: beneficiaryUser._id,
      beneficiaryEmail: normalizedEmail,
      nickname: trimmedNickname,
    });
    return res
      .status(201)
      .json({ message: "Beneficiary added successfully", beneficiary });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    return res.status(400).json({ message: errorMessage });
  }
};

exports.getBeneficiaries = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const beneficiaries = await Beneficiary.find({ ownerUserId }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ beneficiaries });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteBeneficiary = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const { id } = req.params;
    const deleted = await Beneficiary.findOneAndDelete({
      _id: id,
      ownerUserId,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Beneficiary not found" });
    }
    return res
      .status(200)
      .json({ message: "Beneficiary deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
