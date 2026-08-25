const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    bankName: {
        type: String,
        required: true,
        trim: true,
    },
    accountNumber: {
        type: String,
        required: true,
        trim: true,
    },
    ifscCode: {
        type: String,
        required: true,
        trim: true,
    },
    accountHolderName: {
        type: String,
        required: true,
        trim: true,

    },
    isPrimary: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["PENDING", "VERIFIED"],
        default: "VERIFIED",
    }

},
    { timestamps: true }
);

bankAccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

module.exports = mongoose.model("BankAccount", bankAccountSchema);