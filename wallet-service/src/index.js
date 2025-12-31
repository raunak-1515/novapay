require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const walletRoutes = require("./routes/walletRoutes");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/wallet", walletRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Wallet Service connected to Mongo");
    app.listen(process.env.PORT, () =>
      console.log(`Wallet Servuce running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error", err));
