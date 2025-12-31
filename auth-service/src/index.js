require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Auth Service Connected to MongoDB");
    app.listen(process.env.PORT, () => {
      console.log(`Auth Service running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("Mongo error: ", err));
