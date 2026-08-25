const crypto = require("crypto");
if (!global.crypto) global.crypto = crypto.webcrypto;

const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});
console.log("MONGO_URI USED:", process.env.MONGO_URI);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io and allow the frontend to connect
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT"]
  }
});
// This is a neat trick: Make "io" globally available to all our controllers!
app.set("io", io);

io.on("connection", (socket) => {
  console.log("A user connected to WebSockets:", socket.id);

  // Users will join a private "room" named after their User ID
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal notification room!`);
  });
});


app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Auth Service Connected to MongoDB");
    server.listen(process.env.PORT, () => {
      console.log(`Auth Service running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("Mongo error: ", err));
