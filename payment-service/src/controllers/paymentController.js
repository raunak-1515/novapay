const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const axios = require("axios");

exports.transfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fromUserId = req.user.userId;
    const { toUserId, amount } = req.body;
    if (!toUserId || amount <= 0) {
      throw new Error("Invalid transfer data");
    }
    //Ask Wallet Service to debit sender
    await axios.post(
      `${process.env.WALLET_SERVICE_URL}/wallet/debit`,
      { amount },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    //Ask Wallet Service to credit receiver
    await axios.post(
      `${process.env.WALLET_SERVICE_URL}/wallet/credit`,
      { userId: toUserId, amount },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const transaction = await Transaction.create(
      [
        {
          fromUserId,
          toUserId,
          amount,
          status: "SUCCESS",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Transfer successful",
      transactionId: transaction[0]._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await Transaction.create({
      fromUserId: req.user.userId,
      toUserId: req.body.toUserId,
      amount: req.body.amount,
      status: "FAILED",
    });
    res.status(400).json({ error: error.message });
  }
};
