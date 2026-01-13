const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  try {
    req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
};
