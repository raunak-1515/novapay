const Wallet = require("../models/Wallet");

exports.createWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const existing = await Wallet.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "Wallet already exists" });
    }
    const wallet = await Wallet.create({ userId });
    res.json({
      message: "Wallet created",
      walletId: wallet._id,
      balance: wallet.balance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json({ balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.topUp = async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    wallet.balance += amount;
    await wallet.save();
    res.json({
      message: "Wallet topped up",
      balance: wallet.balance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.debitWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    if (wallet.balance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    wallet.balance -= amount;
    await wallet.save();
    res.json({ message: "Debit successful", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: "Debit failed" });
  }
};

exports.creditWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || amount <= 0)
      return res.status(400).json({ message: "Invalid input" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "wallet not found" });

    wallet.balance += amount;
    await wallet.save();

    res.json({ message: "wallet credited", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: "Credit failed" });
  }
};
