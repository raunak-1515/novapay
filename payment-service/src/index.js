const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});
const express = require("express");
const mongoose = require("mongoose");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
app.use(express.json());
const cors = require("cors");
require("./workers/emailWorker");

app.use(cors({ origin: "http://localhost:5173" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Payment service connected to Mongo"))
  .catch((err) => console.error(err));

app.use("/payments", paymentRoutes);

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
