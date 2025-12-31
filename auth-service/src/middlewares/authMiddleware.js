const jwt = require("jsonwebtoken");
exports.authRequired = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
exports.requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.statu(403).json({ message: "Access denied" });
  }
  next();
};
