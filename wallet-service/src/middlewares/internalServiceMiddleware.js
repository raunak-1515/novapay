exports.requireInternalService = (req, res, next) => {
  const internalSecret = req.headers["x-internal-service-secret"];
  if (!internalSecret) {
    return res.status(401).json({ message: "Missing internal service secret" });
  }
  if (internalSecret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ message: "Invalid internal service secret" });
  }
  next();
};
