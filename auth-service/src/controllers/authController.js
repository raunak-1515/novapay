const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ email: normalizedEmail, passwordHash });
    await newUser.save();

    await axios.post(
      `${process.env.WALLET_SERVICE_URL}/wallet/provision`,
      {
        userId: newUser._id,
      },
      {
        headers: {
          "x-internal-service-secret": process.env.INTERNAL_SERVICE_SECRET,
        },
      },
    );
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    return res.status(200).json({
      message: "Login successful",
      accessToken: token,
      user: {
        _id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("CRASH DETAILS:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "_id email",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "user not found" })
    return res.status(200).json({ user });



  } catch (error) {
    return res.status(500).json({ error: error.message });

  }
}

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dob, address } = req.body;
    const user = await User.findByIdAndUpdate(req.user.userId,
      { firstName, lastName, phone, dob, address },
      { new: true }// This returns the updated user
    ).select("-passwordHash");
    return res.status(200).json({ message: "Profile updated successfully", user });

  } catch (error) {
    res.status(500).json({ error: error.message });

  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    // Multer automatically saves the file. We just need to save the URL to the DB.
    const fileUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePictureUrl: fileUrl },
      { new: true }
    ).select("-passwordHash");

    return res.status(200).json({ message: "Avatar uploaded successfully", user });

  } catch (error) {
    return res.status(500).json({ error: error.message });

  }
}

exports.uploadKyc = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        kycDocumentUrl: fileUrl,
        kycStatus: "PENDING"
      },
      { new: true }
    ).select("-passwordHash");
    return res.status(200).json({ message: "KYC document uploaded successfully", user })



  } catch (error) {
    return res.status(500).json({ error: error.message });

  }
};


exports.verifyKyc = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user and update their status to VERIFIED
    const user = await User.findByIdAndUpdate(userId, { kycStatus: "VERIFIED" }, { new: true }).select("-passwordHash");


    if (!user) return res.status(404).json({ message: "User not found" });

    // Grab the global Socket.io instance we created earlier
    const io = req.app.get("io");
    if (io) {
      // Magically send a live WebSocket event ONLY to this specific user!
      io.to(userId).emit("kyc_approved", {
        message: "Congratulations! Your KYC document has been approved.",
        user: user
      });

    }
    return res.status(200).json({ message: "KYC Verified Successfully", user });

  } catch (error) {
    return res.status(500).json({ error: error.message });

  }
}

