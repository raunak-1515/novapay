const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const emailService = require("../services/emailService");
const redisClient = require("../config/redisClient");
const { publishMessage } = require("../config/rabbitmq");




exports.transfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const fromUserId = req.user.userId;
  const { recipientEmail, amount, note } = req.body;
  const normalizedRecipientEmail = recipientEmail?.trim().toLowerCase();
  const numericAmount = Number(amount);
  const trimmedNote = note?.trim() || "";

  try {
    if (!normalizedRecipientEmail) {
      throw new Error("Recipient email is required");
    }
    if (!numericAmount || numericAmount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const userResponse = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/user`,
      {
        params: { email: normalizedRecipientEmail },
      },
    );

    const toUserId = userResponse.data.user._id;
    if (String(toUserId) === String(fromUserId)) {
      throw new Error("You cannot transfer money to yourself");
    }
    //Ask Wallet Service to debit sender
    await axios.post(
      `${process.env.WALLET_SERVICE_URL}/wallet/debit`,
      { amount: numericAmount },
      {
        headers: {
          Authorization: req.headers.authorization,
          "x-internal-service-secret": process.env.INTERNAL_SERVICE_SECRET,
        },
      },
    );

    //Ask Wallet Service to credit receiver
    await axios.post(
      `${process.env.WALLET_SERVICE_URL}/wallet/credit`,
      { userId: toUserId, amount: numericAmount },
      {
        headers: {
          "x-internal-service-secret": process.env.INTERNAL_SERVICE_SECRET,
        },
      },
    );

    const transaction = await Transaction.create(
      [
        {
          fromUserId,
          toUserId,
          amount: numericAmount,
          note: trimmedNote,
          status: "SUCCESS",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    // Invalidate the cache for BOTH the sender and the receiver
    await redisClient.del(`history_${fromUserId}`);
    await redisClient.del(`history_${toUserId}`);

    const senderEmail = req.user.email;
    if (senderEmail) {
      // Fire and forget email notification through rabbitMQ feature
      publishMessage("email_queue", {
        type: "TRANSFER_SUCCESS",
        senderEmail: senderEmail,
        recipientEmail: normalizedRecipientEmail,
        amount: numericAmount,
      });

    }


    res.json({
      message: "Transfer successful",
      transactionId: transaction[0]._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await Transaction.create({
      fromUserId: req.user.userId,
      toUserId: req.user.userId,
      amount: numericAmount || 0,
      note: trimmedNote,
      status: "FAILED",
    });
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    res.status(400).json({ error: errorMessage });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `history_${userId}`;

    // 1. Check Redis for Cached Data
    const cachedHistory = await redisClient.get(cacheKey);
    if (cachedHistory) {
      console.log("Cache Hit! Serving from Redis...");
      return res.status(200).json({ transactions: JSON.parse(cachedHistory) });
    }

    console.log("Cache Miss! Fetching from MongoDB...");
    // 2. If not in cache, query MongoDB
    const transactions = await Transaction.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).sort({ createdAt: -1 });

    // 3. Save the result to Redis with an expiration of 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(transactions));

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
