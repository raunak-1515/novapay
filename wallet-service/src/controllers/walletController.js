const Wallet = require("../models/Wallet");
const BankAccount = require("../models/BankAccount");


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

exports.provisionWallet = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const existing = await Wallet.findOne({ userId });

    if (existing) {
      return res.status(200).json({
        message: "Wallet already exists",
        walletId: existing._id,
        balance: existing.balance,
      });
    }
    const wallet = await Wallet.create({ userId });
    return res.status(201).json({
      message: "Wallet provisioned successfully",
      walletId: wallet._id,
      balance: wallet.balance,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
    const userId = req.user.userId;
    const { amount, bankAccountId } = req.body;
    const numericAmount = Number(amount);
    if (numericAmount <= 0 || !numericAmount)
      return res.status(400).json({ message: "Invalid amount" });
    if (!bankAccountId) {
      return res.status(400).json({ message: "Please select a bank account to fund this top-up  " });

    }
    // Verify the selected bank account exists and belongs to the user
    const bankAccount = await BankAccount.findOne({ _id: bankAccountId, userId });
    if (!bankAccount) {
      return res.status(404).json({ message: "Selected bank account is not linked or valid" });
    }
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    wallet.balance += numericAmount;
    await wallet.save();
    res.json({
      message: `Successfully loaded Rs.${numericAmount} from ${bankAccount.bankName} (**** ${bankAccount.accountNumber.slice(-4)})`,
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
    const numericAmount = Number(amount);

    if (numericAmount <= 0 || !numericAmount)
      return res.status(400).json({ message: "Invalid amount" });

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    if (wallet.balance < numericAmount)
      return res.status(400).json({ message: "Insufficient balance" });

    wallet.balance -= numericAmount;
    await wallet.save();
    res.json({ message: "Debit successful", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: "Debit failed" });
  }
};

exports.creditWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const numericAmount = Number(amount);

    if (!userId || numericAmount <= 0 || !numericAmount)
      return res.status(400).json({ message: "Invalid input" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "wallet not found" });

    wallet.balance += numericAmount;
    await wallet.save();

    res.json({ message: "wallet credited", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: "Credit failed" });
  }
};

exports.addBankAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bankName, accountNumber, ifscCode, accountHolderName, isPrimary } = req.body;

    // 1. Validation
    if (!bankName?.trim() || !accountNumber?.trim() || !ifscCode?.trim() || !accountHolderName?.trim()) {
      return res.status(400).json({ message: "All bank account details are required" });
    }

    // 2. Check if already linked
    const existing = await BankAccount.findOne({ userId, accountNumber: accountNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: "This bank account is already linked" });
    }

    // 3. Handle isPrimary updates
    const makePrimary = !!isPrimary;
    if (makePrimary) {
      // Unset any previous primary bank accounts for this user
      await BankAccount.updateMany({ userId }, { isPrimary: false });
    }

    // Check if this is the user's first bank account. If so, make it primary automatically.
    const count = await BankAccount.countDocuments({ userId });
    const isFirstAccount = count === 0;

    const bankAccount = await BankAccount.create({
      userId,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountHolderName: accountHolderName.trim(),
      isPrimary: isFirstAccount ? true : makePrimary,
    });

    return res.status(201).json({
      message: "Bank account linked successfully",
      bankAccount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getBankAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const accounts = await BankAccount.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });
    return res.status(200).json({ bankAccounts: accounts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const account = await BankAccount.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    const wasPrimary = account.isPrimary;
    await BankAccount.deleteOne({ _id: id, userId });

    // If we deleted the primary account, promote the next available account to primary
    if (wasPrimary) {
      const nextAccount = await BankAccount.findOne({ userId });
      if (nextAccount) {
        nextAccount.isPrimary = true;
        await nextAccount.save();
      }
    }

    return res.status(200).json({ message: "Bank account unlinked successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
