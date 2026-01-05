const requireLogin = require("./requireLogin");

// Express supports arrays of middleware. This ensures:
// 1) user is authenticated (requireLogin)
// 2) user is a parent (isParent === true)
module.exports = [
  requireLogin,
  (req, res, next) => {
    if (!req.user || !req.user.isParent) {
      return res.status(403).json({ message: "Parent access only" });
    }
    next();
  },
];


